import UIKit
import WebKit

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
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsAirPlayForMediaPlayback = true
        config.allowsPictureInPictureMediaPlayback = false
        config.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "nativeFetch")
        if let url = Bundle.main.url(forResource: "native-fetch", withExtension: "js"),
           let js = try? String(contentsOf: url, encoding: .utf8) {
            config.userContentController.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        web = WKWebView(frame: .zero, configuration: config)
        web.translatesAutoresizingMaskIntoConstraints = false
        web.navigationDelegate = self
        web.isOpaque = false
        web.backgroundColor = .black
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
                guard let data = data, data.count <= 64 * 1024 * 1024,
                      let response = response as? HTTPURLResponse else {
                    replyHandler(nil,"Response too large or invalid"); return
                }
                var headers: [String:String] = [:]
                for (key,value) in response.allHeaderFields {
                    headers[String(describing:key)] = String(describing:value)
                }
                replyHandler(["status":response.statusCode,"headers":headers,"base64":data.base64EncodedString()],nil)
            }
        }.resume()
    }
}
