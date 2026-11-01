import UIKit
import WebKit
import VLCKit
import AVFAudio
import AVKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = PlayerController()
        window?.makeKeyAndVisible()
        return true
    }
}

final class PlayerController: UIViewController, WKNavigationDelegate, WKScriptMessageHandlerWithReply, VLCRendererDiscovererDelegate {
    private var web: WKWebView!
    private let surface = UIView()
    private let nativePlayer = VLCMediaPlayer()
    private var mediaTimer: Timer?
    private var mediaID = 0
    private var lastMediaState = ""
    private let vlcQueue = DispatchQueue(label: "com.alaa.player.vlc", qos: .userInitiated)
    private var polling = false
    private var pendingSeek: Double?
    private var seekInFlight = false
    private var currentURL: URL?
    private var aspectMode = "fit"
    private var cachedVideoSize = CGSize.zero
    private let routePicker = AVRoutePickerView(frame: CGRect(x: 0, y: 0, width: 1, height: 1))
    private var discoverers: [VLCRendererDiscoverer] = []
    private var renderers: [VLCRendererItem] = []
    private var activeRenderer: VLCRendererItem?
    private var castLive = false

    private let session: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.httpCookieStorage = nil
        c.urlCredentialStorage = nil
        c.timeoutIntervalForRequest = 25
        c.timeoutIntervalForResource = 30
        return URLSession(configuration: c)
    }()
    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    deinit { mediaTimer?.invalidate(); discoverers.forEach { $0.stop() }; nativePlayer.stop() }
    override func viewDidLoad() {
        super.viewDidLoad()
        let config = WKWebViewConfiguration()
        config.userContentController.addUserScript(WKUserScript(source: "window.APForceTouch=true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsAirPlayForMediaPlayback = true
        config.allowsPictureInPictureMediaPlayback = false
        config.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "nativeFetch")
        if let url = Bundle.main.url(forResource: "native-fetch", withExtension: "js"),
           let js = try? String(contentsOf: url, encoding: .utf8) {
            config.userContentController.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        config.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "nativePlayer")
        if let url = Bundle.main.url(forResource: "native-player", withExtension: "js"), let js = try? String(contentsOf: url, encoding: .utf8) {
            config.userContentController.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        surface.backgroundColor = .black
        surface.frame = view.bounds
        view.addSubview(surface)
        surface.clipsToBounds = false
        view.clipsToBounds = true
        nativePlayer.drawable = surface
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
        try? AVAudioSession.sharedInstance().setActive(true)
        web = WKWebView(frame: .zero, configuration: config)
        web.translatesAutoresizingMaskIntoConstraints = false
        web.navigationDelegate = self
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.backgroundColor = .clear
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.bounces = false
        view.backgroundColor = .black
        view.addSubview(web)
        // Invisible system AirPlay picker; the gold web button triggers it through the bridge.
        routePicker.alpha = 0.02
        routePicker.isUserInteractionEnabled = false
        routePicker.prioritizesVideoDevices = true
        routePicker.activeTintColor = UIColor(red: 0.89, green: 0.72, blue: 0.37, alpha: 1)
        view.addSubview(routePicker)
        NSLayoutConstraint.activate([
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            web.topAnchor.constraint(equalTo: view.topAnchor),
            web.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }
    // Only bundled app code may navigate this web view or call the HTTP bridge.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let url = navigationAction.request.url
        let root = Bundle.main.bundleURL.appendingPathComponent("www").standardizedFileURL.path + "/"
        decisionHandler(url?.isFileURL == true && url!.standardizedFileURL.path.hasPrefix(root) ? .allow : .cancel)
    }
    func userContentController(_ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        if message.name == "nativePlayer" {
            handlePlayer(message, reply: replyHandler); return
        }
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true,
              let obj = message.body as? [String: Any], let text = obj["url"] as? String,
              let url = URL(string: text), ["http","https"].contains(url.scheme?.lowercased() ?? ""),
              url.host != nil, url.user == nil, url.password == nil else {
            replyHandler(nil, "Invalid native request"); return
        }
        let method = (obj["method"] as? String ?? "GET").uppercased()
        guard ["GET","HEAD","POST"].contains(method) else { replyHandler(nil,"Unsupported method"); return }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.cachePolicy = .reloadIgnoringLocalCacheData
        if let headers = obj["headers"] as? [String:String] {
            for (key, value) in headers where !["host","cookie","origin","referer"].contains(key.lowercased()) {
                req.setValue(value, forHTTPHeaderField: key)
            }
        }
        if let body = obj["body"] as? String {
            guard body.utf8.count <= 2_000_000 else { replyHandler(nil,"Request too large"); return }
            req.httpBody = body.data(using: .utf8)
        }
        session.dataTask(with: req) { data, response, error in
            DispatchQueue.main.async {
                if let error = error { replyHandler(nil,error.localizedDescription); return }
                guard let response = response as? HTTPURLResponse else {
                    replyHandler(nil,"Native HTTP response missing"); return
                }
                let data = data ?? Data()
                guard data.count <= 128 * 1024 * 1024 else {
                    replyHandler(nil,"Native HTTP response exceeds 128 MiB (" + String(data.count) + " bytes)"); return
                }
                var headers: [String:String] = [:]
                for (key,value) in response.allHeaderFields {
                    headers[String(describing:key)] = String(describing:value)
                }
                replyHandler(["status":response.statusCode,"headers":headers,"base64":data.base64EncodedString()],nil)
            }
        }.resume()
    }

    private func handlePlayer(_ message: WKScriptMessage, reply: @escaping (Any?, String?) -> Void) {
        let root = Bundle.main.bundleURL.appendingPathComponent("www").standardizedFileURL.path + "/"
        guard message.frameInfo.isMainFrame,
              let origin = message.frameInfo.request.url, origin.isFileURL, origin.standardizedFileURL.path.hasPrefix(root),
              let o = message.body as? [String:Any], let command = o["command"] as? String else {
            reply(nil,"Invalid player request"); return
        }
        // 2.8: no libVLC call ever runs on the main thread. libvlc_media_player_set_time,
        // libvlc_video_get_size and libvlc_media_player_has_vout take the player lock; during a
        // seek VLC's iOS video output needs the main thread while that lock is held, so calling
        // them from main (seek button, 4x/s polling) deadlocked the whole app. Every command is
        // queued on vlcQueue and answered immediately, so the web UI can never wait on VLC.
        switch command {
        case "open":
            guard let text = o["url"] as? String, let url = URL(string:text),
                  ["http","https"].contains(url.scheme?.lowercased() ?? ""), url.host != nil,
                  url.user == nil, url.password == nil else { reply(nil,"Invalid media URL"); return }
            let id = o["id"] as? Int ?? 0
            let start = (o["start"] as? Double).flatMap { $0.isFinite && $0 > 0 ? $0 : nil }
            mediaID = id
            lastMediaState = ""
            castLive = false
            currentURL = url
            pendingSeek = nil
            seekInFlight = false
            cachedVideoSize = .zero
            applyAspect()
            let renderer = activeRenderer
            vlcQueue.async { [weak self] in self?.openOnQueue(url, start: start, renderer: renderer) }
            startPolling()
        case "stop":
            stopPolling()
            currentURL = nil
            pendingSeek = nil
            castLive = false
            let wasCasting = activeRenderer != nil
            activeRenderer = nil
            vlcQueue.async { [weak self] in
                guard let self = self else { return }
                self.nativePlayer.stop()
                if wasCasting { _ = self.nativePlayer.setRendererItem(nil) }
                self.nativePlayer.media = nil
            }
            if wasCasting { publishCast() }
        case "play": vlcQueue.async { [weak self] in self?.nativePlayer.play() }
        case "pause": vlcQueue.async { [weak self] in self?.nativePlayer.pause() }
        case "seek":
            if let raw = o["value"] as? Double, raw.isFinite { requestSeek(max(0, raw)) }
        case "rate":
            if let rate = o["value"] as? Double, rate >= 0.25, rate <= 3 {
                vlcQueue.async { [weak self] in self?.nativePlayer.rate = Float(rate) }
            }
        case "aspect":
            let mode = o["value"] as? String ?? "fit"
            guard ["fit","fill","stretch","16:9","4:3","21:9"].contains(mode) else { reply(nil,"Unsupported aspect"); return }
            aspectMode = mode
            applyAspect()
        case "tracks":
            vlcQueue.async { [weak self] in
                guard let self = self else { return }
                let audio = self.nativePlayer.audioTracks.enumerated().map { (n, t) -> [String:Any] in
                    ["index":n,"name":t.trackName,"language":t.language ?? "","selected":t.isSelected]
                }
                let text = self.nativePlayer.textTracks.enumerated().map { (n, t) -> [String:Any] in
                    ["index":n,"name":t.trackName,"language":t.language ?? "","selected":t.isSelected]
                }
                DispatchQueue.main.async { reply(["audio":audio,"text":text],nil) }
            }
            return
        case "audioTrack", "textTrack":
            let index = o["value"] as? Int ?? -1
            let audio = command == "audioTrack"
            vlcQueue.async { [weak self] in
                guard let self = self else { return }
                let tracks = audio ? self.nativePlayer.audioTracks : self.nativePlayer.textTracks
                if index >= 0 && index < tracks.count { tracks[index].isSelectedExclusively = true }
                else if !audio { self.nativePlayer.deselectAllTextTracks() }
            }
        case "airplay":
            showRoutePicker()
        case "haptic":
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "cast":
            // Chromecast through VLCKit's own renderer (microdns discovery + chromecast output).
            var castURL = currentURL
            if let text = o["url"] as? String, let url = URL(string:text),
               ["http","https"].contains(url.scheme?.lowercased() ?? ""), url.host != nil {
                castURL = url
            }
            guard let target = castURL else { reply(nil,"Nothing to cast"); return }
            presentCastPicker(url: target, live: o["live"] as? Bool ?? false, start: o["time"] as? Double ?? 0)
        case "castStop":
            stopCasting()
        default: reply(nil,"Unsupported player command"); return
        }
        reply(["ok":true,"version":2],nil)
    }

    // MARK: VLC (always on vlcQueue)
    private func openOnQueue(_ url: URL, start: Double?, renderer: VLCRendererItem?) {
        nativePlayer.stop()
        guard let media = VLCMedia(url:url) else { return }
        media.addOption(":network-caching=1500")
        if let start = start, start > 1 { media.addOption(":start-time=" + String(Int(start))) }
        _ = nativePlayer.setRendererItem(renderer)
        nativePlayer.media = media
        nativePlayer.play()
    }
    private func requestSeek(_ seconds: Double) {
        // Coalesce: repeated ±30 taps keep only the newest target while one seek is applied.
        pendingSeek = seconds
        if seekInFlight { return }
        drainSeek()
    }
    private func drainSeek() {
        guard let target = pendingSeek else { seekInFlight = false; return }
        pendingSeek = nil
        seekInFlight = true
        vlcQueue.async { [weak self] in
            guard let self = self else { return }
            self.nativePlayer.time = VLCTime(int:Int32(min(target * 1000, Double(Int32.max))))
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { [weak self] in self?.drainSeek() }
        }
    }
    private func startPolling() {
        mediaTimer?.invalidate()
        mediaTimer = Timer.scheduledTimer(withTimeInterval:0.25, repeats:true) { [weak self] _ in self?.poll() }
    }
    private func stopPolling() { mediaTimer?.invalidate(); mediaTimer = nil }
    private func poll() {
        if polling { return }
        polling = true
        let id = mediaID
        vlcQueue.async { [weak self] in
            guard let self = self else { return }
            let state: String
            switch self.nativePlayer.state {
            case .playing: state = "playing"
            case .paused: state = "pause"
            case .error: state = "error"
            case .stopped: state = "ended"
            default: state = "waiting"
            }
            let size = self.nativePlayer.videoSize
            let payload: [String:Any] = ["id":id,"state":state,
                "time":max(0,Double(self.nativePlayer.time.intValue)/1000),
                "duration":max(0,Double(self.nativePlayer.media?.length.intValue ?? 0)/1000),
                "width":size.width,"height":size.height,
                "video":self.nativePlayer.hasVideoOut || self.activeRenderer != nil,
                "casting":self.activeRenderer?.name ?? ""]
            DispatchQueue.main.async {
                self.polling = false
                if size.width > 0 && size.height > 0 && size != self.cachedVideoSize {
                    self.cachedVideoSize = size
                    self.applyAspect()
                }
                self.publish(payload)
            }
        }
    }
    private func publish(_ payload: [String:Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject:payload), let json = String(data:data,encoding:.utf8) else { return }
        web.evaluateJavaScript("window.APNativeMediaUpdate && window.APNativeMediaUpdate(" + json + ")", completionHandler:nil)
    }

    // MARK: Screen size (UIKit transform of the VLC surface; no VLC call, no lock)
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        applyAspect()
    }
    private func applyAspect() {
        let bounds = view.bounds
        surface.transform = .identity
        surface.frame = bounds
        guard bounds.width > 0, bounds.height > 0, aspectMode != "fit" else { return }
        let video = cachedVideoSize.width > 0 && cachedVideoSize.height > 0 ? cachedVideoSize : CGSize(width: 16, height: 9)
        let fit = min(bounds.width / video.width, bounds.height / video.height)
        let shown = CGSize(width: video.width * fit, height: video.height * fit)
        var sx: CGFloat = 1, sy: CGFloat = 1
        switch aspectMode {
        case "fill":
            let k = max(bounds.width / shown.width, bounds.height / shown.height); sx = k; sy = k
        case "stretch":
            sx = bounds.width / shown.width; sy = bounds.height / shown.height
        default:
            let parts = aspectMode.split(separator: ":").compactMap { Double($0) }
            guard parts.count == 2, parts[0] > 0, parts[1] > 0 else { return }
            let ratio = CGFloat(parts[0] / parts[1])
            let target = bounds.width / bounds.height > ratio
                ? CGSize(width: bounds.height * ratio, height: bounds.height)
                : CGSize(width: bounds.width, height: bounds.width / ratio)
            sx = target.width / shown.width; sy = target.height / shown.height
        }
        surface.transform = CGAffineTransform(scaleX: sx, y: sy)
    }

    // MARK: AirPlay
    private func showRoutePicker() {
        guard let button = routePicker.subviews.compactMap({ $0 as? UIButton }).first else { return }
        button.sendActions(for: .touchUpInside)
    }

    // MARK: Chromecast (VLCKit renderer)
    private func startDiscovery() {
        guard discoverers.isEmpty else { return }
        let names = (VLCRendererDiscoverer.list() ?? []).map { $0.name }
        for name in names {
            guard let d = VLCRendererDiscoverer(name: name) else { continue }
            d.delegate = self
            if d.start() { discoverers.append(d) }
        }
    }
    func rendererDiscovererItemAdded(_ rendererDiscoverer: VLCRendererDiscoverer, item: VLCRendererItem) {
        DispatchQueue.main.async {
            if !self.renderers.contains(where: { $0 === item }) { self.renderers.append(item) }
        }
    }
    func rendererDiscovererItemDeleted(_ rendererDiscoverer: VLCRendererDiscoverer, item: VLCRendererItem) {
        DispatchQueue.main.async { self.renderers.removeAll { $0 === item } }
    }
    private func presentCastPicker(url: URL, live: Bool, start: Double) {
        startDiscovery()
        // Give mDNS a moment on the first tap, then list what was found.
        let delay: Double = renderers.isEmpty ? 2.5 : 0
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let self = self, self.presentedViewController == nil else { return }
            let sheet = UIAlertController(title: "Chromecast",
                message: self.renderers.isEmpty ? "لم يتم العثور على جهاز Chromecast على نفس شبكة Wi‑Fi" : "اختر الجهاز",
                preferredStyle: .actionSheet)
            for item in self.renderers {
                sheet.addAction(UIAlertAction(title: item.name, style: .default) { _ in
                    self.startCasting(item, url: url, live: live, start: start)
                })
            }
            if self.activeRenderer != nil {
                sheet.addAction(UIAlertAction(title: "إيقاف البث على التلفاز", style: .destructive) { _ in self.stopCasting() })
            }
            sheet.addAction(UIAlertAction(title: "إلغاء", style: .cancel))
            if let pop = sheet.popoverPresentationController {
                pop.sourceView = self.view
                pop.sourceRect = CGRect(x: self.view.bounds.maxX - 60, y: 40, width: 1, height: 1)
            }
            self.present(sheet, animated: true)
        }
    }
    private func startCasting(_ item: VLCRendererItem, url: URL, live: Bool, start: Double) {
        activeRenderer = item
        castLive = live
        if live { currentURL = url; mediaID = -1 }
        let resume = start.isFinite && start > 0 ? start : nil
        vlcQueue.async { [weak self] in self?.openOnQueue(url, start: resume, renderer: item) }
        startPolling()
        publishCast()
    }
    private func stopCasting() {
        guard activeRenderer != nil else { return }
        activeRenderer = nil
        let wasLive = castLive
        castLive = false
        let url = currentURL
        vlcQueue.async { [weak self] in
            guard let self = self else { return }
            let time = Double(self.nativePlayer.time.intValue) / 1000
            _ = self.nativePlayer.setRendererItem(nil)
            if wasLive || url == nil { self.nativePlayer.stop(); self.nativePlayer.media = nil }
            else if let url = url { self.openOnQueue(url, start: time, renderer: nil) }
        }
        if wasLive { stopPolling(); currentURL = nil }
        publishCast()
    }
    private func publishCast() {
        let payload: [String:Any] = ["active": activeRenderer != nil, "name": activeRenderer?.name ?? "", "live": castLive]
        guard let data = try? JSONSerialization.data(withJSONObject:payload), let json = String(data:data,encoding:.utf8) else { return }
        web.evaluateJavaScript("window.APNativeCastState && window.APNativeCastState(" + json + ")", completionHandler:nil)
    }
}
