import XCTest
import WebKit
@testable import AlaaPlayer

final class NativeBridgeTests: XCTestCase {
    @MainActor
    func testRealHTTPProviderThroughBundledBridge() async throws {
        let controller = PlayerController()
        controller.loadViewIfNeeded()
        let web = try XCTUnwrap(controller.view.subviews.compactMap { $0 as? WKWebView }.first)
        var ready = false
        for _ in 0..<100 {
            try await Task.sleep(nanoseconds: 100_000_000)
            if (try? await web.evaluateJavaScript("typeof window.AP==='object' && typeof window.webkit.messageHandlers.nativeFetch==='object'")) as? Bool == true { ready = true; break }
        }
        XCTAssertTrue(ready)
        let ats = try XCTUnwrap(Bundle.main.object(forInfoDictionaryKey: "NSAppTransportSecurity") as? [String:Any])
        XCTAssertEqual(ats["NSAllowsArbitraryLoads"] as? Bool, true)
        XCTAssertNil(ats["NSAllowsArbitraryLoadsInWebContent"])
        let fixture = try Data(contentsOf: XCTUnwrap(Bundle(for: Self.self).url(forResource: "test-provider", withExtension: "json")))
        let provider = try XCTUnwrap(JSONSerialization.jsonObject(with: fixture) as? [String:Any])
        let result = try await web.callAsyncJavaScript("""
            const p=provider;
            const root=p.server.endsWith('/')?p.server.slice(0,-1):p.server;
            const endpoint=root+'/player_api.php?username='+encodeURIComponent(p.username)+'&password='+encodeURIComponent(p.password);
            const counts={};
            let auth;try{auth=await (await fetch(endpoint)).json();}catch(e){throw Error('Authentication bridge: '+e.message);}
            if(!auth.user_info || !Number(auth.user_info.auth)) throw Error('Provider auth failed');
            for(const kind of ['live','vod','series']){
                const categoryAction=kind==='series'?'get_series_categories':'get_'+kind+'_categories';
                let response;
                try {
                    const categories=await (await fetch(endpoint+'&action='+categoryAction)).json();
                    if(!Array.isArray(categories)||!categories.length)throw Error('Empty categories');
                    response=await fetch(endpoint+'&action=get_'+(kind==='series'?'series':kind+'_streams')+'&category_id='+encodeURIComponent(categories[0].category_id));
                } catch(e) { throw Error(kind+' native catalog: '+e.message); }
                if(!response.ok) throw Error('Provider HTTP '+response.status);
                const rows=await response.json();
                if(!Array.isArray(rows)||rows.length===0)throw Error('Empty '+kind);
                counts[kind]=rows.length;
            }
            const panel=await fetch(window.PANEL_PUBLIC.base+'/rest/v1/rpc/get_device_config_v2',{
                method:'POST',headers:{apikey:window.PANEL_PUBLIC.anon,'Content-Type':'application/json'},
                body:JSON.stringify({p_device_code:'IPA_READONLY_TEST',p_device_token:'readonly-probe-not-a-device-secret'})
            });
            if(!panel.ok)throw Error('Panel HTTP '+panel.status);
            const config=await panel.json();
            if(!config.status)throw Error('Panel response invalid');
            return counts;
        """, arguments: ["provider":provider], in: nil, contentWorld: .page)
        let counts = try XCTUnwrap(result as? [String:Any])
        XCTAssertGreaterThan((counts["live"] as? Int) ?? 0,0)
        XCTAssertGreaterThan((counts["vod"] as? Int) ?? 0,0)
        XCTAssertGreaterThan((counts["series"] as? Int) ?? 0,0)
        print("Native real-provider catalog counts",counts)
    }
}
