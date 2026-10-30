import UIKit
import WebKit
import VLCKit
import AVFAudio

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

final class PlayerController: UIViewController, WKNavigationDelegate, WKScriptMessageHandlerWithReply {
    private var web: WKWebView!
    private let surface = UIView()
    private let nativePlayer = VLCMediaPlayer()
    private var mediaTimer: Timer?
    private var mediaID = 0
    private var lastMediaState = ""

    private let session: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.httpCookieStorage = nil
        c.urlCredentialStorage = nil
        c.timeoutIntervalForRequest = 25
        c.timeoutIntervalForResource = 30
        return URLSession(configuration: c)
    }()
    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
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
        if let url = Bundle.main.url(forResource: "native-player", withExtension: "js"), let js = try? String(contentsOf: url) {
            config.userContentController.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        surface.backgroundColor = .black
        surface.frame = view.bounds
        surface.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(surface)
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
        switch command {
        case "open":
            guard let text = o["url"] as? String, let url = URL(string:text),
                  ["http","https"].contains(url.scheme?.lowercased() ?? ""), url.host != nil,
                  url.user == nil, url.password == nil else { reply(nil,"Invalid media URL"); return }
            nativePlayer.stop()
            mediaID = o["id"] as? Int ?? 0
            lastMediaState = ""
            guard let media = VLCMedia(url:url) else { reply(nil,"Invalid media"); return }
            media.addOption(":network-caching=1500")
            nativePlayer.media = media
            nativePlayer.play()
            mediaTimer?.invalidate()
            mediaTimer = Timer.scheduledTimer(withTimeInterval:0.25, repeats:true) { [weak self] _ in self?.publishMedia() }
        case "stop":
            mediaTimer?.invalidate(); mediaTimer = nil
            nativePlayer.stop(); nativePlayer.media = nil
        case "play": nativePlayer.play()
        case "pause": nativePlayer.pause()
        case "seek":
            if let seconds = o["value"] as? Double, seconds.isFinite, seconds >= 0 {
                nativePlayer.time = VLCTime(int:Int32(min(seconds * 1000,Double(Int32.max))))
            }
        case "rate":
            if let rate = o["value"] as? Double, rate >= 0.25, rate <= 3 { nativePlayer.rate = Float(rate) }
        default: reply(nil,"Unsupported player command"); return
        }
        reply(["ok":true],nil)
    }
    private func publishMedia() {
        let state: String
        switch nativePlayer.state {
        case .playing: state = "playing"
        case .paused: state = "pause"
        case .error: state = "error"
        case .stopped: state = "ended"
        default: state = "waiting"
        }
        let payload: [String:Any] = ["id":mediaID,"state":state,
            "time":max(0,Double(nativePlayer.time.intValue)/1000),
            "duration":max(0,Double(nativePlayer.media?.length.intValue ?? 0)/1000),
            "width":nativePlayer.videoSize.width,"height":nativePlayer.videoSize.height,
            "video":nativePlayer.hasVideoOut]
        guard let data = try? JSONSerialization.data(withJSONObject:payload), let json = String(data:data,encoding:.utf8) else { return }
        web.evaluateJavaScript("window.APNativeMediaUpdate && window.APNativeMediaUpdate(" + json + ")", completionHandler:nil)
    }
}
