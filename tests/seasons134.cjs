const assert=require('node:assert/strict'),A=require('../app/core.js');
const ep=(id,season)=>({id,title:'Episode',season,container_extension:'mp4'}),provider={server:'https://fixture.example',username:'test',password:'test'};
for(const metadata of [[],[{season_number:'1',id:900,name:'One'}],[{season_number:2,id:901},{id:999}]]){
 const json={seasons:metadata,episodes:{'10':[ep(10,1)],'02':[ep(2,1)],'1':[ep(1,99)],'0':[ep(0,9)]}};
 assert.deepEqual(A.seasons(json).map(s=>s.number),['0','1','2','10']);
 assert.deepEqual(A.episodes(json,provider).map(e=>e.season),['0','1','2','10']);
}
assert.deepEqual(A.seasons({seasons:[{id:44}],episodes:{}}),[]);
assert.deepEqual(A.seasons({seasons:[{season_number:3,name:'Three',air_date:'known'}],episodes:{'1':[]}}).map(s=>s.number),['1','3']);
console.log('SEASON_UNION134_PASS empty/incomplete/numeric/specials/bucket-authority/id-not-season');
