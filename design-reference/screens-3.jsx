/* ─── Phase 3 mockups · Expert Tools ─── */

/* 16 — Become Expert (step 2) */
function BecomeExpertScreen(){
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'10px 16px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:40,height:40,borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{flex:1,fontWeight:700,fontSize:18}}>Become a Local Expert</span>
        <span style={{padding:'4px 10px',background:'var(--surface)',borderRadius:999,fontSize:12,fontWeight:700,color:'var(--text-3)'}}>2 / 2</span>
      </div>
      <div className="scroll" style={{padding:16,height:'calc(100% - 28px - 60px - 84px)'}}>
        <div className="h2" style={{fontSize:24,marginBottom:6,letterSpacing:-0.3}}>What's your daily rate?</div>
        <div className="sm" style={{color:'var(--text-2)',marginBottom:24,lineHeight:1.5}}>This is shown to employers. You can update it anytime.</div>

        <div style={{display:'flex',alignItems:'center',background:'var(--surface)',borderRadius:12,minHeight:64,overflow:'hidden',marginBottom:16}}>
          <div style={{width:52,height:64,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:22}}>₹</div>
          <input style={{flex:1,padding:'14px 12px',border:0,background:'transparent',fontWeight:700,fontSize:26,letterSpacing:1,outline:'none'}} defaultValue="500"/>
          <div style={{paddingRight:16,color:'var(--text-3)',fontSize:14}}>/day</div>
        </div>

        <div style={{display:'flex',gap:10,marginBottom:16}}>
          {[300,500,700,1000].map(v=>(
            <span key={v} className={`chip ${v===500?'active':''}`} style={{flex:1,justifyContent:'center',minHeight:48,padding:'0 4px',fontSize:14}}>₹{v}</span>
          ))}
        </div>
        <div className="meta" style={{lineHeight:1.5}}>Average: ₹400 – ₹800 / day for most trades in tier-2 cities.</div>
      </div>
      <div className="sticky" style={{display:'flex',gap:8}}>
        <button className="btn btn-outline" style={{flex:1}}>Back</button>
        <button className="btn btn-lg" style={{flex:2}}>
          <i className="ion-ios-checkmark-circle-outline"></i> Create My Profile
        </button>
      </div>
    </div>
  );
}

/* 17 — Portfolio */
function PortfolioScreen(){
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'10px 16px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{flex:1,fontWeight:700,fontSize:18,marginLeft:8}}>Portfolio</span>
      </div>
      <div className="scroll" style={{padding:'2px 2px 60px',height:'calc(100% - 28px - 60px)'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:2}}>
          {[1,2,3,4,5].map(i=>(
            <div key={i} style={{aspectRatio:'1',background:`linear-gradient(135deg,${['#5a6a4a','#7a5a3a','#3d4a58','#5a504c','#4c5a4c'][i-1]},#2c2c30)`}}></div>
          ))}
          <div style={{aspectRatio:'1',background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8}}><i className="ion-ios-add" style={{fontSize:32,color:'var(--text-3)'}}></i></div>
        </div>
        <div className="meta" style={{textAlign:'center',marginTop:12,padding:'0 16px'}}>Long-press a tile to remove</div>
      </div>
    </div>
  );
}

/* 18 — Certifications */
function CertificationsScreen(){
  const certs = [
    {name:"ITI Plumbing Certificate", skill:"plumber", issued:"Govt of UP · 2019", verified:true},
    {name:"Pipe-fitting Workshop",    skill:"plumber", issued:"Indo-German Tool Room", verified:false},
    {name:"Trade Test — Class A",     skill:"electrician", issued:"NSDC · 2021",  verified:true},
  ];
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'10px 16px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{flex:1,fontWeight:700,fontSize:18,marginLeft:8}}>Certifications</span>
      </div>
      <div className="scroll" style={{padding:16,height:'calc(100% - 28px - 60px - 84px)'}}>
        {certs.map(c=>(
          <div key={c.name} className="card mb-12" style={{display:'flex',gap:12}}>
            <div className="grow">
              <div style={{fontWeight:700,fontSize:14}}>{c.name}</div>
              <div className="meta" style={{textTransform:'capitalize'}}>{c.skill}</div>
              <div className="meta">{c.issued}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
              {c.verified
                ? <span className="chip success" style={{fontSize:10,padding:'4px 10px'}}>VERIFIED</span>
                : <span className="chip warn" style={{fontSize:10,padding:'4px 10px',background:'var(--warning-bg)',color:'var(--warning)'}}>PENDING</span>
              }
              <i className="ion-ios-trash" style={{color:'var(--danger)',fontSize:16}}></i>
            </div>
          </div>
        ))}
      </div>
      <div className="sticky">
        <button className="btn btn-block btn-lg"><i className="ion-ios-add"></i> Add Certificate</button>
      </div>
    </div>
  );
}

/* 19 — Video Profile */
function VideoProfileScreen(){
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'10px 16px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{flex:1,fontWeight:700,fontSize:18,marginLeft:8}}>Video Profile</span>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,textAlign:'center'}}>
        <div style={{width:96,height:96,borderRadius:48,background:'var(--success-bg)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
          <i className="ion-ios-videocam" style={{fontSize:48,color:'var(--success)'}}></i>
        </div>
        <div style={{fontWeight:700,fontSize:18,marginBottom:8}}>Video on file</div>
        <div className="sm" style={{color:'var(--text-2)',lineHeight:1.5,marginBottom:32,maxWidth:280}}>A 30-60s video helps you get hired 3x faster. Show your face, talk briefly about your skill.</div>
        <button className="btn btn-lg" style={{minWidth:200}}>Change video</button>
      </div>
    </div>
  );
}

/* 20 — KYC */
function KYCScreen(){
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'10px 16px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{flex:1,fontWeight:700,fontSize:18,marginLeft:8}}>KYC Verification</span>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,textAlign:'center'}}>
        <div style={{width:96,height:96,borderRadius:48,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
          <i className="ion-ios-shield" style={{fontSize:48,color:'var(--text-3)'}}></i>
        </div>
        <div className="h2" style={{fontSize:22,marginBottom:8}}>Get verified</div>
        <div className="sm" style={{color:'var(--text-2)',lineHeight:1.6,marginBottom:32,maxWidth:300}}>Verified experts appear higher in search and earn customer trust. Takes 2 minutes with your Aadhaar.</div>
        <button className="btn btn-lg" style={{minWidth:200}}>Start KYC</button>
      </div>
    </div>
  );
}

/* 21 — Earnings */
function EarningsScreen(){
  const jobs = [
    {title:"Boundary wall masonry",     date:"May 22",  rating:5, amt:1500},
    {title:"Pipe leak repair",           date:"May 18",  rating:5, amt:600},
    {title:"Bathroom drainage clear",    date:"May 14",  rating:4, amt:500},
    {title:"Kitchen tap install",        date:"May 9",   rating:5, amt:400},
  ];
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'8px 16px'}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:-8}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{flex:1,fontWeight:700,fontSize:18,textAlign:'center'}}>Earnings</span>
        <div style={{width:40}}></div>
      </div>
      <div className="scroll" style={{padding:'0 16px 80px',height:'calc(100% - 28px - 56px)'}}>
        <div style={{background:'var(--primary)',color:'#fff',borderRadius:16,padding:24,textAlign:'center',marginTop:8}}>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>This Month</div>
          <div style={{fontSize:44,fontWeight:700,letterSpacing:-1}}>₹14,500</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginTop:4,marginBottom:24}}>₹68,400 total earned</div>
          <div style={{display:'flex',background:'rgba(255,255,255,0.1)',borderRadius:14,padding:'14px 8px'}}>
            <div style={{flex:1,textAlign:'center'}}><i className="ion-ios-briefcase-outline" style={{fontSize:16,color:'rgba(255,255,255,0.8)'}}></i><div style={{fontWeight:700,fontSize:16,marginTop:6}}>4</div><div style={{fontSize:11,color:'rgba(255,255,255,0.7)'}}>Jobs Done</div></div>
            <div style={{width:1,background:'rgba(255,255,255,0.2)'}}></div>
            <div style={{flex:1,textAlign:'center'}}><i className="ion-ios-star-outline" style={{fontSize:16,color:'rgba(255,255,255,0.8)'}}></i><div style={{fontWeight:700,fontSize:16,marginTop:6}}>4.8</div><div style={{fontSize:11,color:'rgba(255,255,255,0.7)'}}>Avg Rating</div></div>
            <div style={{width:1,background:'rgba(255,255,255,0.2)'}}></div>
            <div style={{flex:1,textAlign:'center'}}><i className="ion-ios-trending-up" style={{fontSize:16,color:'rgba(255,255,255,0.8)'}}></i><div style={{fontWeight:700,fontSize:16,marginTop:6}}>₹3625</div><div style={{fontSize:11,color:'rgba(255,255,255,0.7)'}}>Per Job</div></div>
          </div>
        </div>

        <div className="ctitle" style={{marginTop:24,marginBottom:12}}>Recent Jobs</div>
        {jobs.map(j=>(
          <div key={j.title} className="card mb-12" style={{display:'flex',gap:12,padding:14}}>
            <div style={{width:40,height:40,borderRadius:12,background:'var(--success-bg)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-checkmark-circle" style={{color:'var(--success)',fontSize:20}}></i></div>
            <div className="grow">
              <div style={{fontWeight:700,fontSize:14}}>{j.title}</div>
              <div className="meta" style={{marginTop:2}}>{j.date}</div>
              <div className="row gap-4" style={{marginTop:4}}>
                {Array.from({length:5}).map((_,i)=>(<i key={i} className={i<j.rating?"ion-ios-star":"ion-ios-star-outline"} style={{fontSize:12,color:i<j.rating?'#F59E0B':'var(--text-3)'}}></i>))}
              </div>
            </div>
            <div style={{fontWeight:700,fontSize:15,color:'var(--success)'}}>₹{j.amt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 22 — QR Code */
function QRCodeScreen(){
  // simple SVG-style QR placeholder
  const rows = 7, cols = 7;
  const cells = [];
  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
    const corner = (r<2 && c<2) || (r<2 && c>cols-3) || (r>rows-3 && c<2);
    const fill = corner || Math.random() > 0.55;
    cells.push({ r, c, fill });
  }
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'10px 16px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{flex:1,fontWeight:700,fontSize:18,marginLeft:8}}>My QR Code</span>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
        <div className="card" style={{padding:24,alignItems:'center',width:'100%',maxWidth:320}}>
          <div style={{fontWeight:700,fontSize:18,marginBottom:16,textAlign:'center'}}>Ramesh Gupta</div>
          <div style={{width:220,height:220,padding:12,background:'#fff'}}>
            <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gridAutoRows:'1fr',width:'100%',height:'100%',gap:2}}>
              {cells.map((c,i)=>(<div key={i} style={{background:c.fill?'#000':'#fff',borderRadius:1}}></div>))}
            </div>
          </div>
          <div className="meta" style={{marginTop:16,textAlign:'center',maxWidth:240,lineHeight:1.5}}>Scan to view my profile · share with anyone</div>
        </div>
        <button className="btn btn-lg" style={{marginTop:20,minWidth:240}}><i className="ion-ios-share"></i> Share Profile</button>
      </div>
    </div>
  );
}

/* 23 — Saved Experts */
function SavedExpertsScreen(){
  const experts = [
    {name:"Suresh Kumar",skills:"Plumber · Pipe fitting · Drainage",rate:600,avail:true,letter:"S",bg:"bg-1"},
    {name:"Manoj Yadav", skills:"Electrician · Wiring",                rate:800,avail:false,letter:"M",bg:"bg-2"},
    {name:"Anil Patil",  skills:"Carpenter · Furniture",                rate:550,avail:true,letter:"A",bg:"bg-3"},
  ];
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'10px 16px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{flex:1,fontWeight:700,fontSize:18,marginLeft:8}}>Saved Experts</span>
      </div>
      <div className="scroll" style={{height:'calc(100% - 28px - 60px)'}}>
        {experts.map(e=>(
          <div key={e.name} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
            <div className={`avatar ${e.bg}`} style={{borderRadius:12,width:48,height:48,fontSize:16}}>{e.letter}</div>
            <div className="grow">
              <div style={{fontWeight:700,fontSize:15}}>{e.name}</div>
              <div className="meta" style={{marginTop:2}}>{e.skills}</div>
              <div style={{fontWeight:700,fontSize:13,color:'var(--success)',marginTop:2}}>₹{e.rate}/day</div>
              {e.avail && <span className="chip success" style={{marginTop:6,fontSize:10,padding:'4px 10px'}}>● Available Now</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  BecomeExpertScreen, PortfolioScreen, CertificationsScreen, VideoProfileScreen,
  KYCScreen, EarningsScreen, QRCodeScreen, SavedExpertsScreen,
});
