import XCTest
import WebKit
@testable import AlaaPlayer

final class PlaybackTests: XCTestCase {
    @MainActor
    func testRealEpisodeMovieAndLiveFramesAdvance() async throws {
        let controller = PlayerController()
        let window = UIWindow(frame:CGRect(x:0,y:0,width:844,height:390))
        window.rootViewController = controller
        window.makeKeyAndVisible()
        controller.loadViewIfNeeded()
        let web = try XCTUnwrap(controller.view.subviews.compactMap{$0 as? WKWebView}.first)
        for _ in 0..<150 {
            if (try? await web.evaluateJavaScript("!!(window.AP && window.APNativePlayback)")) as? Bool == true { break }
            try await Task.sleep(nanoseconds:100_000_000)
        }
        let data = try Data(contentsOf:XCTUnwrap(Bundle(for:Self.self).url(forResource:"test-provider",withExtension:"json")))
        let provider = try XCTUnwrap(JSONSerialization.jsonObject(with:data) as? [String:Any])
        // Populate through the same manual form as a real owner, not a synthetic media URL.
        _ = try await web.callAsyncJavaScript("""
            window.__testMedia=document.querySelector('#video');
            document.querySelector('#settings-open').click();
            document.querySelector('#manual-toggle').click();
            const type=document.querySelector('#manual-type');type.value='xtream';type.dispatchEvent(new Event('change'));
            document.querySelector('#manual-url').value=provider.server;
            document.querySelector('#manual-user').value=provider.username;
            document.querySelector('#manual-pass').value=provider.password;
            document.querySelector('#manual').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
            return true;
        """,arguments:["provider":provider],in:nil,contentWorld:.page)
        for _ in 0..<300 {
            if (try? await web.evaluateJavaScript("document.querySelector('#items button')!==null && document.querySelector('#connection').hidden")) as? Bool == true { break }
            try await Task.sleep(nanoseconds:200_000_000)
        }
        // Provider metadata supplies original container/direct_source. No invented .m3u8 path.
        let media = try await web.callAsyncJavaScript("""
            const p=provider,root=p.server.replace(/\\/$/,''),api=root+'/player_api.php?username='+encodeURIComponent(p.username)+'&password='+encodeURIComponent(p.password);
            async function get(action){const r=await fetch(api+'&action='+action);if(!r.ok)throw Error('Catalog HTTP '+r.status);return r.json();}
            const picks={};
            for(const [kind,catAction,listAction] of [['live','get_live_categories','get_live_streams'],['movies','get_vod_categories','get_vod_streams'],['series','get_series_categories','get_series']]){
                const categories=await get(catAction);
                const safe=categories.filter(c=>!(/adult|xxx|porn|18\\+|erotik|horror|action|crime/i.test(c.category_name||'')));
                safe.sort((a,b)=>Number(/kids|family|comedy|document|nature|cartoon/i.test(b.category_name))-Number(/kids|family|comedy|document|nature|cartoon/i.test(a.category_name)));
                let items=[];
                for(const c of safe.slice(0,8)){const rows=await get(listAction+'&category_id='+encodeURIComponent(c.category_id));if(Array.isArray(rows)&&rows.length){items=AP.xcItems(rows,categories,p,kind);break;}}
                if(!items.length)throw Error('No nonadult '+kind+' test candidate');
                if(kind==='series'){
                    const details=await get('get_series_info&series_id='+encodeURIComponent(items[0].id));
                    const episodes=AP.episodes(details,p);if(!episodes.length)throw Error('No episodes');
                    picks.episode=episodes.slice(0,3);
                }else picks[kind]=items.slice(0,3);
            }
            return picks;
        """,arguments:["provider":provider],in:nil,contentWorld:.page)
        let candidates = try XCTUnwrap(media as? [String:Any])
        for kind in ["episode","movies","live"] {
            let rows = try XCTUnwrap(candidates[kind] as? [[String:Any]])
            var played = false
            for item in rows {
                _ = try await web.callAsyncJavaScript("""
                    const v=window.__testMedia,player=document.querySelector('#player');if(!v.parentNode)player.prepend(v);
                    v.pause();v.replaceChildren();v.removeAttribute('src');v.load();
                    player.hidden=false;player.dataset.playbackKind=kind==='live'?'live':'vod';
                    const s=document.createElement('source');s.src=item.url;if(/m3u8(?:$|\\?)/i.test(item.url))s.type='application/vnd.apple.mpegurl';
                    v.appendChild(s);v.load();try{await v.play();}catch(e){return false;}return true;
                """,arguments:["item":item,"kind":kind],in:nil,contentWorld:.page)
                var start: Double?
                for _ in 0..<200 {
                    let result = try? await web.evaluateJavaScript("JSON.stringify({time:document.querySelector('#video').currentTime,width:document.querySelector('#video').videoWidth,height:document.querySelector('#video').videoHeight,ready:document.querySelector('#video').readyState})")
                    if let text = result as? String, let data = text.data(using:.utf8), let info = try? JSONSerialization.jsonObject(with:data) as? [String:Any], let time = info["time"] as? Double, (info["width"] as? Int ?? 0)>0, (info["ready"] as? Int ?? 0)>=3 {
                        if start == nil { start=time }
                        if time-(start ?? time)>2 { played=true;break }
                    }
                    try await Task.sleep(nanoseconds:250_000_000)
                }
                if played { break }
            }
            XCTAssertTrue(played,"Real provider \(kind) must decode video frames and advance >2 seconds")
            let shot = UIGraphicsImageRenderer(bounds:window.bounds).image { _ in window.drawHierarchy(in:window.bounds,afterScreenUpdates:true) }
            let a=XCTAttachment(image:shot);a.name="real-\(kind)-advancing";a.lifetime = .keepAlways;add(a)
            print("Real media frame advancement",kind,played)
            _ = try await web.evaluateJavaScript("document.querySelector('#video').pause();document.querySelector('#video').replaceChildren();document.querySelector('#video').load()")
        }
    }
}
