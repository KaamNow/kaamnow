/*
 * KaamNow mobile — Batch 1 visual preview.
 * Static React mockups of all 8 redesigned screens, using the same design
 * tokens applied in mobile/src/theme.js. Layout matches the actual screens
 * close enough to verify the visual language; minor data simplification.
 */

const StatusBar = () => (
  <div className="status">
    <span className="time">9:41</span>
    <span className="right"><i className="ion-ios-cellular"></i> <i className="ion-ios-wifi"></i> <i className="ion-ios-battery-full"></i></span>
  </div>
);

const TabBar = ({active = "home"}) => (
  <div className="tabbar">
    <div className={`tab ${active==='home'?'active':''}`}><i className="ion-ios-home"></i><span>Home</span></div>
    <div className={`tab ${active==='find'?'active':''}`}><i className="ion-ios-search"></i><span>Find</span></div>
    <div className="tab fab"><div className="fab-circle"><i className="ion-ios-add"></i></div><span style={{marginTop:4}}>Post</span></div>
    <div className={`tab ${active==='activity'?'active':''}`}><i className="ion-ios-list-box"></i><span>Activity</span></div>
    <div className={`tab ${active==='profile'?'active':''}`}><i className="ion-ios-person"></i><span>Profile</span></div>
  </div>
);

const TopHeader = ({title, right}) => (
  <div className="top">
    <div className="back"><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
    <span className="title">{title}</span>
    {right && <div className="right-actions">{right}</div>}
  </div>
);

/* ───────────────────────────────────────────────────────── 01 · Dashboard */
function DashboardScreen(){
  return (
    <div className="scr">
      <StatusBar/>
      {/* Top: location + actions */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px 12px',background:'#fff',boxShadow:'0 4px 12px rgba(11,11,20,.04)'}}>
        <div>
          <div style={{fontSize:11,color:'var(--text-3)'}}>Location</div>
          <div style={{display:'flex',alignItems:'center',gap:4,marginTop:2}}>
            <span style={{fontWeight:700,fontSize:14}}>Pratapgarh, UP</span>
            <i className="ion-ios-arrow-down" style={{fontSize:12}}></i>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:40,height:40,borderRadius:20,background:'var(--surface-muted)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
            <i className="ion-ios-notifications-outline" style={{fontSize:22}}></i>
            <div style={{position:'absolute',top:-2,right:-2,minWidth:16,height:16,borderRadius:8,background:'var(--danger)',color:'#fff',fontSize:9,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',border:'1.5px solid #fff',padding:'0 3px'}}>3</div>
          </div>
          <div style={{width:40,height:40,borderRadius:20,background:'var(--primary)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>R</div>
        </div>
      </div>

      <div className="body scroll" style={{height:'calc(100% - 28px - 64px)'}}>
        <div className="searchbar mb-24">
          <i className="ion-ios-search-strong" style={{color:'var(--text-3)',fontSize:20}}></i>
          <input placeholder="Search for experts or jobs..."/>
        </div>

        <div style={{display:'flex',gap:16}} className="mb-24">
          <div className="hero dark">
            <div className="icon"><i className="ion-ios-search" style={{color:'#fff',fontSize:22}}></i></div>
            <div>
              <div className="title">Find Local<br/>Expert</div>
              <div className="sub">Hire top talent<br/>for your task</div>
            </div>
          </div>
          <div className="hero light">
            <div className="icon"><i className="ion-ios-briefcase" style={{color:'var(--text)',fontSize:22}}></i></div>
            <div>
              <div className="title">Find Work</div>
              <div className="sub">Apply for nearby<br/>job openings</div>
            </div>
          </div>
        </div>

        <div className="row between mb-12">
          <span className="h3">Categories</span>
        </div>
        <div className="catgrid mb-12">
          {[
            {l:"Mason",   bg:"linear-gradient(135deg,#8a6e4b,#4a3a2a)"},
            {l:"Electrician", bg:"linear-gradient(135deg,#3d3d4a,#1c1c24)"},
            {l:"Farming", bg:"linear-gradient(135deg,#4d6a3a,#2b3f20)"},
            {l:"Cleaning",bg:"linear-gradient(135deg,#5a6a72,#2c3640)"},
          ].map(c=>(
            <div className="cat" key={c.l} style={{backgroundImage:c.bg}}>
              <i className="ion-ios-hammer ic"></i>
              <div className="lbl">{c.l}</div>
            </div>
          ))}
        </div>
        <button style={{width:'100%',minHeight:44,background:'#fff',border:'1px solid var(--border)',borderRadius:12,fontWeight:700,fontSize:13,color:'var(--text-2)',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>View All Categories <i className="ion-ios-arrow-down" style={{fontSize:11}}></i></button>

        <div className="section">
          <div className="head">
            <span className="h3">Urgent Jobs</span>
            <span style={{color:'var(--danger)',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:4}}><i className="ion-ios-time"></i> Hiring Now</span>
          </div>

          <div className="ujob">
            <div className="row gap-6 mb-8">
              <span className="chip danger">URGENT</span>
              <span className="meta">2h ago</span>
            </div>
            <div className="h4" style={{marginBottom:6,lineHeight:1.4}}>Need 2 masons for boundary wall</div>
            <div className="row gap-12 mb-12" style={{flexWrap:'wrap'}}>
              <span className="meta row gap-4"><i className="ion-ios-pin"></i> Wardha, MH</span>
              <span style={{color:'var(--text)',fontWeight:700,fontSize:13}}>₹500/day</span>
            </div>
            <div className="row gap-8">
              <button className="btn btn-outline" style={{flex:1}}>Details</button>
              <button className="btn" style={{flex:1}}>Apply Now</button>
            </div>
          </div>
        </div>
      </div>
      <div className="chat-fab"><i className="ion-ios-chatbubbles" style={{fontSize:24}}></i></div>
      <TabBar active="home"/>
    </div>
  );
}

/* ───────────────────────────────────────────────────── 02 · Marketplace */
function MarketplaceScreen(){
  const skills = ["All","Electrician","Plumber","Carpenter","Painter","Driver"];
  const experts = [
    {name:"Suresh Kumar",skill:"Plumber · 6 yrs exp",rating:4.8,rev:124,loc:"Pratapgarh · 230001",rate:600,unit:"/day",verified:true, bg:"bg-1", letter:"S"},
    {name:"Manoj Yadav",skill:"Electrician · 9 yrs exp",rating:4.6,rev:88,loc:"Wardha · 442001",rate:800,unit:"/day",verified:true, bg:"bg-2", letter:"M"},
    {name:"Anil Patil",skill:"Carpenter · 4 yrs exp",rating:4.2,rev:31,loc:"Hoshangabad",rate:550,unit:"/day",verified:false,bg:"bg-3",letter:"A"},
  ];
  return (
    <div className="scr">
      <StatusBar/>
      <div style={{padding:'8px 16px 12px',borderBottom:'1px solid var(--border)'}}>
        <div className="row" style={{marginBottom:8}}>
          <div className="back" style={{width:40,height:40,marginLeft:-8,display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
          <span className="h2">Find Experts</span>
        </div>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'var(--surface-muted)',borderRadius:999,padding:'7px 12px',marginBottom:12}}>
          <i className="ion-ios-pin" style={{fontSize:14}}></i>
          <span style={{fontWeight:700,fontSize:13}}>Pratapgarh, UP</span>
          <i className="ion-ios-arrow-down" style={{fontSize:11,color:'var(--text-3)'}}></i>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={{flex:1,minHeight:52,background:'var(--surface-muted)',borderRadius:12,display:'flex',alignItems:'center',gap:8,padding:'0 14px'}}>
            <i className="ion-ios-search-strong" style={{fontSize:20,color:'var(--text-3)'}}></i>
            <span style={{color:'var(--text-3)',fontSize:15}}>Search for plumbers, electricians...</span>
          </div>
          <div style={{width:52,height:52,borderRadius:12,background:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <i className="ion-ios-options" style={{color:'#fff',fontSize:22}}></i>
          </div>
        </div>
      </div>

      <div style={{padding:'12px 16px',display:'flex',gap:8,overflowX:'auto'}}>
        <div className="chip success" style={{whiteSpace:'nowrap'}}>
          <span style={{width:7,height:7,borderRadius:4,background:'var(--success)',opacity:.5,display:'inline-block'}}></span>
          Available Now
        </div>
        {skills.map((s,i)=>(
          <div key={s} className={`chip ${i===1?'active':''}`} style={{whiteSpace:'nowrap'}}>{s}</div>
        ))}
      </div>

      <div className="scroll" style={{padding:'4px 16px 100px',height:'calc(100% - 28px - 72px - 240px)'}}>
        <div className="row between mb-12" style={{alignItems:'baseline'}}>
          <span style={{fontWeight:700,fontSize:16}}>{experts.length} Experts Found</span>
          <span style={{fontSize:12,color:'var(--text-3)'}}>Sorted by rating</span>
        </div>

        {experts.map(e=>(
          <div className="wcard" key={e.name}>
            <div className="top-row">
              <div className={`avatar ${e.bg}`} style={{borderRadius:12,width:72,height:72}}>{e.letter}</div>
              <div className="info">
                <div className="name-row">
                  <span className="name ellipsis">{e.name}</span>
                  {e.verified && <i className="ion-ios-checkmark-circle" style={{color:'var(--accent)',fontSize:16}}></i>}
                </div>
                <div className="meta-row">{e.skill}</div>
                <div className="rating-row">
                  <i className="ion-ios-star star"></i>
                  <span style={{fontWeight:700}}>{e.rating.toFixed(1)}</span>
                  <span style={{color:'var(--text-2)'}}>({e.rev} reviews)</span>
                </div>
                <div className="loc-row"><i className="ion-ios-pin"></i><span className="ellipsis">{e.loc}</span></div>
              </div>
            </div>
            <div className="divider"></div>
            <div className="foot">
              <div className="price-block">
                <div className="starting">Starting from</div>
                <div className="price">₹{e.rate}<span style={{fontWeight:400,fontSize:13,color:'var(--text-3)'}}>{e.unit}</span></div>
              </div>
              <div className="actions">
                <button className="btn btn-secondary">Profile</button>
                <button className="btn">Book Now</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <TabBar active="find"/>
    </div>
  );
}

/* ────────────────────────────────────────────────── 03 · Worker Profile */
function WorkerProfileScreen(){
  return (
    <div className="scr">
      <StatusBar/>
      <div style={{padding:'6px 12px',display:'flex',alignItems:'center'}}>
        <div className="back"><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{flex:1,textAlign:'center',fontWeight:700,fontSize:16}}>Expert Profile</span>
        <div className="back"><i className="ion-ios-share-alt" style={{fontSize:20}}></i></div>
        <div className="back"><i className="ion-ios-heart-outline" style={{fontSize:20}}></i></div>
      </div>
      <div className="scroll" style={{height:'calc(100% - 28px - 56px - 88px)',paddingBottom:24}}>
        <div className="wp-hero">
          <div className="pill-verified"><i className="ion-ios-checkmark-circle"></i> Verified Expert</div>
        </div>
        <div className="wp-identity">
          <div className="wp-avatar-wrap">
            <div className="avatar bg-1" style={{width:86,height:86,borderRadius:'50%',fontSize:28}}>S</div>
            <div className="wp-online"></div>
          </div>
          <div className="h1" style={{marginTop:14,fontSize:24}}>Suresh Kumar</div>
          <div className="row gap-4 mt-8" style={{color:'var(--text-3)',fontSize:13}}>
            <i className="ion-ios-pin"></i> Pratapgarh, UP · 230001
          </div>
          <div className="row gap-6 mt-12">
            <div className="chip"><i className="ion-ios-checkmark"></i> Verified</div>
            <div style={{display:'inline-flex',alignItems:'center',gap:4}}>
              <i className="ion-ios-star star"></i>
              <span style={{fontWeight:700}}>4.8</span>
              <span style={{color:'var(--text-2)',fontSize:13}}>· 124 jobs</span>
            </div>
          </div>
        </div>

        <div className="wp-stats">
          <div className="wp-stat"><div style={{fontWeight:800,fontSize:18}}>6 yrs</div><div className="label">Experience</div></div>
          <div className="wp-stat"><div style={{fontWeight:800,fontSize:18,color:'var(--money)'}}>₹600</div><div className="label">Day rate</div></div>
          <div className="wp-stat"><div style={{fontWeight:800,fontSize:18}}>98%</div><div className="label">On-time</div></div>
        </div>

        <div style={{padding:'24px 16px 0'}}>
          <div className="ctitle">Skills</div>
          <div className="row gap-6" style={{flexWrap:'wrap',marginBottom:24}}>
            {["Plumbing","Pipe fitting","Tap repair","Drainage"].map(s=><span className="chip" key={s}>{s}</span>)}
          </div>

          <div className="ctitle">About</div>
          <p className="b" style={{lineHeight:1.55,marginBottom:24,color:'var(--text-2)'}}>
            6 years of hands-on plumbing experience across residential and small commercial sites. Polite, on-time, brings own basic tools.
          </p>

          <div className="row between mb-12">
            <span className="ctitle" style={{margin:0}}>Reviews (124)</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:3,fontWeight:700,fontSize:12}}><i className="ion-ios-star star"></i> 4.8</span>
          </div>
          <div className="card mb-12">
            <div className="row gap-8 mb-8">
              <div className="avatar bg-2" style={{width:36,height:36,fontSize:13}}>R</div>
              <div className="grow">
                <div style={{fontWeight:700,fontSize:14}}>Ramesh G.</div>
                <div className="meta">2 weeks ago</div>
              </div>
              <span style={{fontWeight:700,fontSize:13}}><i className="ion-ios-star star"></i> 5.0</span>
            </div>
            <div className="b" style={{color:'var(--text-2)',lineHeight:1.5,fontStyle:'italic'}}>
              Very polite, came on time and fixed a tricky bathroom leak. Highly recommend.
            </div>
          </div>
        </div>
      </div>

      <div className="sticky">
        <button className="btn btn-block btn-lg">Book Now · ₹600/day</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── 04 · Find Work */
function FindWorkScreen(){
  const pills = ["Open near me","Today","Recently posted","Urgent"];
  return (
    <div className="scr">
      <StatusBar/>
      <div style={{padding:'8px 16px 12px',borderBottom:'1px solid var(--border)'}}>
        <div className="row" style={{marginBottom:8}}>
          <div className="back" style={{marginLeft:-8}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
          <span className="h2" style={{fontSize:24}}>Find Work</span>
        </div>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'var(--surface-muted)',borderRadius:999,padding:'7px 12px',marginBottom:12}}>
          <i className="ion-ios-pin" style={{fontSize:14}}></i>
          <span style={{fontWeight:700,fontSize:13}}>Pratapgarh, UP</span>
          <i className="ion-ios-arrow-down" style={{fontSize:11,color:'var(--text-3)'}}></i>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={{flex:1,minHeight:52,background:'var(--surface-muted)',borderRadius:12,display:'flex',alignItems:'center',gap:8,padding:'0 14px'}}>
            <i className="ion-ios-search-strong" style={{fontSize:20,color:'var(--text-3)'}}></i>
            <span style={{color:'var(--text-3)',fontSize:15}}>Search jobs by skill or place...</span>
          </div>
          <div style={{width:52,height:52,borderRadius:12,background:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <i className="ion-ios-options" style={{color:'#fff',fontSize:22}}></i>
          </div>
        </div>
      </div>

      <div style={{padding:'12px 16px',display:'flex',gap:8,overflowX:'auto'}}>
        {pills.map((p,i)=>(<div key={p} className={`chip ${i===0?'active':''}`} style={{whiteSpace:'nowrap'}}>{p}</div>))}
      </div>

      <div className="scroll" style={{padding:'4px 16px 100px',height:'calc(100% - 28px - 72px - 220px)'}}>
        <div className="row between mb-12" style={{alignItems:'baseline'}}>
          <span style={{fontWeight:700,fontSize:16}}>12 jobs near you</span>
          <span style={{fontSize:12,color:'var(--text-3)'}}>Updated 2m ago</span>
        </div>

        {[
          {title:"Need 2 masons for boundary wall",rate:500,date:"Tomorrow",poster:"Ramesh G.",rating:4.7,loc:"Pratapgarh · 5 km",urgency:"URGENT"},
          {title:"Painter for 2 BHK interior",rate:700,date:"Sat, 28 May",poster:"Anjali D.",rating:4.4,loc:"Wardha · 3 km",urgency:"SOON"},
          {title:"Electrician for shop wiring",rate:900,date:"Mon, 30 May",poster:"Kishan B.",rating:4.9,loc:"Pratapgarh · 8 km",urgency:null,applied:true},
        ].map(j=>(
          <div className="card mb-12" key={j.title}>
            <div className="row gap-8 mb-12">
              <div className="avatar sm" style={{borderRadius:9}}>{j.poster[0]}</div>
              <div className="grow">
                <div style={{fontWeight:700,fontSize:14}}>{j.poster}</div>
                <div className="row gap-4 mt-8" style={{color:'var(--text-2)',fontSize:12}}>
                  <i className="ion-ios-star star" style={{fontSize:13}}></i> {j.rating.toFixed(1)}
                </div>
              </div>
              {j.urgency==="URGENT" && <span className="chip danger">{j.urgency}</span>}
              {j.urgency==="SOON" && <span className="chip warn" style={{fontSize:10,letterSpacing:.6}}>{j.urgency}</span>}
            </div>

            <div className="h4" style={{marginBottom:10}}>{j.title}</div>

            <div className="row gap-10 mb-12" style={{flexWrap:'wrap',color:'var(--text-2)',fontSize:13}}>
              <span className="row gap-4"><i className="ion-ios-pin"></i> {j.loc}</span>
              <span className="row gap-4"><i className="ion-ios-calendar"></i> {j.date}</span>
            </div>

            <div className="row gap-6 mb-16">
              <span className="chip">Mason</span>
              <span className="chip">Boundary</span>
            </div>

            <div className="row between" style={{borderTop:'1px solid var(--border)',paddingTop:14}}>
              <div>
                <div className="label">Daily rate</div>
                <div style={{fontWeight:700,fontSize:18,color:'var(--money)'}}>₹{j.rate}<span style={{color:'var(--text-3)',fontSize:12,fontWeight:400}}>/day</span></div>
              </div>
              {j.applied
                ? <button className="btn btn-outline" style={{minWidth:132}}>Pending</button>
                : <button className="btn" style={{minWidth:132}}>Apply</button>
              }
            </div>
          </div>
        ))}
      </div>
      <TabBar active="find"/>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── 05 · Post Job */
function PostJobScreen(){
  return (
    <div className="scr">
      <StatusBar/>
      <TopHeader title="Post a Job"/>
      <div className="steps">
        <div className="step active"></div>
        <div className="step active"></div>
        <div className="step"></div>
        <div className="step"></div>
      </div>

      <div className="scroll" style={{padding:'0 16px 120px',height:'calc(100% - 28px - 56px - 36px - 84px)'}}>
        <div className="label" style={{marginBottom:8}}>Step 2 of 4</div>
        <div className="h1" style={{marginBottom:8,fontSize:26}}>What's the work?</div>
        <p className="sm" style={{color:'var(--text-2)',marginBottom:24,lineHeight:1.5}}>Add a clear title and short description. Workers see this first.</p>

        <div className="label" style={{marginBottom:8}}>Job title</div>
        <input className="input mb-16" defaultValue="Need 2 masons for boundary wall"/>

        <div className="label" style={{marginBottom:8}}>Category</div>
        <div className="row gap-8 mb-20" style={{flexWrap:'wrap'}}>
          <span className="chip active"><i className="ion-ios-hammer"></i> Construction</span>
          <span className="chip"><i className="ion-ios-leaf"></i> Farm</span>
          <span className="chip"><i className="ion-ios-home"></i> Home</span>
          <span className="chip">Other</span>
        </div>

        <div className="label" style={{marginBottom:8}}>Description</div>
        <textarea className="input" style={{minHeight:108,padding:'14px 16px',resize:'none',fontFamily:'inherit'}} defaultValue="6 ft × 80 ft boundary wall around the house. Materials provided. Need 2 workers for 3 days."></textarea>

        <div className="row gap-12 mt-16">
          <div style={{flex:1}}>
            <div className="label" style={{marginBottom:8}}>Workers</div>
            <div className="counter">
              <button>−</button>
              <div className="val">2</div>
              <button>+</button>
            </div>
          </div>
          <div style={{flex:1}}>
            <div className="label" style={{marginBottom:8}}>Daily rate (₹)</div>
            <input className="input" defaultValue="500" style={{textAlign:'center',fontWeight:700,fontSize:20}}/>
          </div>
        </div>

        <div className="card mt-20" style={{background:'var(--success-bg)',borderColor:'transparent'}}>
          <div className="row gap-8" style={{alignItems:'flex-start'}}>
            <i className="ion-ios-checkmark-circle" style={{color:'var(--success)',fontSize:18,marginTop:2}}></i>
            <div className="sm" style={{color:'var(--success)',fontWeight:600}}>₹500 is in line with masonry rates near Pratapgarh. You'll get applications quickly.</div>
          </div>
        </div>
      </div>

      <div className="sticky" style={{display:'flex',gap:8}}>
        <button className="btn btn-outline" style={{flex:1}}>Back</button>
        <button className="btn btn-lg" style={{flex:2}}>Continue</button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── 06 · Activity */
function ActivityScreen(){
  const items = [
    {kind:"received", title:"Need a quick plumber tonight", who:"Ramesh G.", price:"₹600", status:"action_required", time:"5m ago"},
    {kind:"sent",     title:"Electrician for shop wiring", who:"Suresh K.", price:"₹900", status:"applied",        time:"1h ago"},
    {kind:"in",       title:"Painter — 2 BHK interior",    who:"Anjali D.", price:"₹700", status:"accepted",        time:"Yesterday"},
    {kind:"done",     title:"Boundary wall masonry",       who:"Kishan B.", price:"₹500", status:"completed",       time:"Last week"},
  ];
  const statusLabel = { action_required:"Action required", applied:"Applied", accepted:"Accepted", completed:"Completed" };
  return (
    <div className="scr">
      <StatusBar/>
      <div style={{padding:'8px 16px 0'}}>
        <span className="h1" style={{fontSize:24}}>Activity</span>
      </div>
      <div className="act-tabs">
        <div className="act-tab active">Received</div>
        <div className="act-tab">Sent</div>
        <div className="act-tab">In Progress</div>
      </div>

      <div className="scroll" style={{padding:'12px 16px 100px',height:'calc(100% - 28px - 92px - 84px)'}}>
        <div style={{display:'flex',gap:8,marginBottom:16,overflowX:'auto'}}>
          {["All","Pending","Accepted","Completed"].map((t,i)=>(<span key={t} className={`chip ${i===1?'active':''}`} style={{whiteSpace:'nowrap'}}>{t}</span>))}
        </div>

        {items.map(it=>(
          <div className="act-card" key={it.title}>
            <div className="head">
              <div style={{flex:1,minWidth:0}}>
                <div className="row gap-8">
                  <div className="avatar xs">{it.who[0]}</div>
                  <span style={{fontWeight:700,fontSize:14}}>{it.who}</span>
                </div>
                <div className="h4 mt-8" style={{lineHeight:1.4}}>{it.title}</div>
              </div>
              <span style={{fontSize:11,color:'var(--text-3)'}}>{it.time}</span>
            </div>
            <div className="row between" style={{alignItems:'center'}}>
              <span className={`badge ${it.status==='applied'?'pending': it.status==='accepted'?'accepted': it.status==='completed'?'done':'pending'}`}>
                <span className="dot"></span>
                {statusLabel[it.status]}
              </span>
              <span style={{fontWeight:700,fontSize:15}}>{it.price}</span>
            </div>
            {it.status==='action_required' && (
              <div className="row gap-8 mt-12">
                <button className="btn btn-outline" style={{flex:1}}>Reject</button>
                <button className="btn" style={{flex:1}}>Accept</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <TabBar active="activity"/>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── 07 · Job Detail */
function JobDetailScreen(){
  return (
    <div className="scr">
      <StatusBar/>
      <div style={{display:'flex',alignItems:'center',padding:'8px 12px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:36,height:36,borderRadius:18,background:'var(--surface-muted)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{fontSize:20}}></i></div>
        <span style={{flex:1,textAlign:'center',fontWeight:700,fontSize:16}}>Job Details</span>
        <div style={{width:36,height:36,borderRadius:18,background:'var(--surface-muted)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-share-alt" style={{fontSize:18}}></i></div>
      </div>

      <div className="scroll" style={{padding:'16px 16px 100px',height:'calc(100% - 28px - 50px - 84px)'}}>
        <div className="jd-title-card mb-12">
          <span className="badge open"><span className="dot"></span>Open</span>
          <div className="h1" style={{marginTop:12,marginBottom:10,fontSize:22,lineHeight:1.3}}>Need 2 masons for boundary wall</div>
          <div className="row gap-8">
            <div className="avatar xs">R</div>
            <span style={{fontWeight:700,fontSize:13}}>Ramesh G.</span>
            <span className="meta">· posted 2h ago</span>
          </div>
        </div>

        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <div className="card" style={{flex:1,padding:14}}><div className="label">Daily rate</div><div style={{fontWeight:800,fontSize:18,color:'var(--money)',marginTop:4}}>₹500</div></div>
          <div className="card" style={{flex:1,padding:14}}><div className="label">Workers</div><div style={{fontWeight:800,fontSize:18,marginTop:4}}>2</div></div>
          <div className="card" style={{flex:1,padding:14}}><div className="label">Date</div><div style={{fontWeight:800,fontSize:18,marginTop:4}}>28 May</div></div>
        </div>

        <div className="card mb-12">
          <div className="ctitle">Description</div>
          <div className="b" style={{lineHeight:1.55,color:'var(--text-2)'}}>
            6 ft × 80 ft boundary wall around the house. Materials provided. Need 2 workers for 3 days. Bring own basic tools.
          </div>
        </div>

        <div className="card mb-12">
          <div className="ctitle">Location</div>
          <div className="row gap-8 b"><i className="ion-ios-pin" style={{color:'var(--text-3)'}}></i> Pratapgarh, UP · 230001</div>
          <div className="meta mt-8" style={{marginLeft:24}}>5 km from your location</div>
        </div>

        <div className="card">
          <div className="row between mb-12">
            <span className="ctitle" style={{margin:0}}>Applications (3)</span>
          </div>
          {["Suresh K.","Anil P.","Kishan B."].map((n,i)=>(
            <div key={n} className="row gap-12" style={{padding:'10px 0',borderTop:i===0?'none':'1px solid var(--border)'}}>
              <div className={`avatar sm bg-${(i%4)+1}`}>{n[0]}</div>
              <div className="grow">
                <div style={{fontWeight:700,fontSize:14}}>{n}</div>
                <div className="row gap-4 mt-8" style={{color:'var(--text-2)',fontSize:12}}>
                  <i className="ion-ios-star star" style={{fontSize:12}}></i> 4.{8-i} · {120-i*20} jobs
                </div>
              </div>
              <div className="row gap-6">
                <button className="btn btn-outline" style={{minHeight:36,padding:'0 12px',fontSize:12}}>Decline</button>
                <button className="btn" style={{minHeight:36,padding:'0 12px',fontSize:12}}>Hire</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="sticky">
        <button className="btn btn-block btn-lg"><i className="ion-ios-hand"></i> Apply for this job</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── 08 · Profile */
function ProfileScreen(){
  const settings = [
    {icon:"ion-ios-bookmark",  label:"Saved experts"},
    {icon:"ion-ios-pin",       label:"Saved addresses", v:"2 saved"},
    {icon:"ion-ios-cash",      label:"Wallet & earnings"},
    {icon:"ion-ios-globe",     label:"Language", v:"English"},
    {icon:"ion-ios-help-buoy", label:"Support"},
    {icon:"ion-ios-document",  label:"Terms & Privacy"},
  ];
  return (
    <div className="scr">
      <StatusBar/>
      <div className="pf-hero">
        <div className="top-bar"><span style={{fontWeight:700,fontSize:18,color:'#fff'}}>Profile</span><div style={{padding:'7px 14px',border:'1px solid rgba(255,255,255,.2)',borderRadius:999,fontSize:13,fontWeight:600}}>Edit</div></div>
        <div className="avatar">R</div>
        <div className="name">Ramesh Gupta</div>
        <div className="phone">+91 98765 43210</div>
        <div className="tier">Gaon Verified</div>
      </div>

      <div className="scroll" style={{padding:'0 16px 100px',marginTop:-20,height:'calc(100% - 28px - 220px - 84px)'}}>
        <div className="card" style={{display:'flex',gap:16,padding:16,marginBottom:16}}>
          <div style={{flex:1,textAlign:'center'}}><div style={{fontWeight:800,fontSize:18}}>23</div><div className="label">Jobs Done</div></div>
          <div style={{width:1,background:'var(--border)'}}></div>
          <div style={{flex:1,textAlign:'center'}}><div style={{fontWeight:800,fontSize:18}}>4.8</div><div className="label">Rating</div></div>
          <div style={{width:1,background:'var(--border)'}}></div>
          <div style={{flex:1,textAlign:'center'}}><div style={{fontWeight:800,fontSize:18}}>98%</div><div className="label">On-time</div></div>
        </div>

        <div className="card row between mb-16" style={{padding:14}}>
          <div className="row gap-12">
            <div className="set-icon"><i className="ion-ios-radio" style={{fontSize:18,color:'var(--success)'}}></i></div>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>Available for work</div>
              <div className="meta">Workers can find and book you</div>
            </div>
          </div>
          <div style={{minHeight:36,padding:'0 16px',borderRadius:999,background:'var(--success)',color:'#fff',display:'inline-flex',alignItems:'center',fontWeight:700,fontSize:13}}>On</div>
        </div>

        <div className="ctitle">Account</div>
        {settings.map(s=>(
          <div className="set-row" key={s.label}>
            <div className="left">
              <div className="set-icon"><i className={s.icon} style={{fontSize:18}}></i></div>
              <span style={{fontWeight:500,fontSize:15}}>{s.label}</span>
            </div>
            <div className="row gap-4" style={{color:'var(--text-3)',fontSize:14}}>
              {s.v && <span>{s.v}</span>}
              <i className="ion-ios-arrow-forward" style={{fontSize:14}}></i>
            </div>
          </div>
        ))}

        <button className="btn btn-outline btn-block mt-16" style={{borderColor:'var(--danger-bg)',color:'var(--danger)'}}>Log out</button>
      </div>
      <TabBar active="profile"/>
    </div>
  );
}

/* ───────────────────────────────────────────────────── Tokens cheat sheet */
function TokensSheet(){
  const colors = [
    {n:"primary",        v:"#000000"},
    {n:"on-primary",     v:"#FFFFFF", border:true},
    {n:"accent",         v:"#3F37C9"},
    {n:"accent-tint",    v:"#EEEDFE", border:true},
    {n:"bg",             v:"#F9F9FE", border:true},
    {n:"surface",        v:"#FFFFFF", border:true},
    {n:"surface-muted",  v:"#F3F3F8", border:true},
    {n:"border",         v:"#E2E2E7"},
    {n:"text",           v:"#1A1C1F"},
    {n:"text-secondary", v:"#5E5E60"},
    {n:"text-muted",     v:"#7E7576"},
    {n:"success",        v:"#137A4A"},
    {n:"danger",         v:"#B42318"},
    {n:"warning",        v:"#92400E"},
  ];
  return (
    <div style={{width:'100%',height:'100%',background:'var(--bg)',padding:32,fontFamily:'Plus Jakarta Sans',overflow:'auto'}}>
      <h2 style={{margin:0,fontWeight:800,fontSize:28}}>Design system — Batch 1</h2>
      <p style={{color:'var(--text-2)',marginTop:6,marginBottom:24,fontSize:14}}>One shared visual language. All tokens live in <code style={{fontFamily:'ui-monospace,monospace',background:'var(--surface-muted)',padding:'2px 6px',borderRadius:4}}>mobile/src/theme.js</code>.</p>

      <h3 style={{margin:'8px 0 12px',fontSize:18}}>Colors</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:14,marginBottom:32}}>
        {colors.map(c=>(
          <div key={c.n}>
            <div style={{height:78,borderRadius:12,background:c.v,border:c.border?'1px solid var(--border)':'none'}}></div>
            <div style={{marginTop:6,fontWeight:700,fontSize:12}}>{c.n}</div>
            <div style={{fontSize:11,color:'var(--text-3)',fontFamily:'ui-monospace,monospace'}}>{c.v}</div>
          </div>
        ))}
      </div>

      <h3 style={{margin:'8px 0 12px',fontSize:18}}>Type · Plus Jakarta Sans</h3>
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:32,background:'var(--surface)',padding:20,borderRadius:16,border:'1px solid var(--border)'}}>
        <div style={{fontSize:28,fontWeight:700}}>Screen title · 28/700</div>
        <div style={{fontSize:20,fontWeight:700}}>Card title · 20/700</div>
        <div style={{fontSize:16,fontWeight:700}}>Section title · 16/700</div>
        <div style={{fontSize:15}}>Body · 15/400</div>
        <div style={{fontSize:13,color:'var(--text-2)'}}>Secondary · 13/400</div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:1.4,textTransform:'uppercase',color:'var(--text-3)'}}>Overline · 11/700 · tracked</div>
      </div>

      <h3 style={{margin:'8px 0 12px',fontSize:18}}>Components</h3>
      <div style={{display:'flex',gap:24,flexWrap:'wrap',marginBottom:24}}>
        <div>
          <div className="label" style={{marginBottom:8}}>Buttons (≥48px height)</div>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <button className="btn">Primary</button>
            <button className="btn btn-outline">Outline</button>
            <button className="btn btn-secondary">Secondary</button>
            <button className="btn btn-danger">Danger</button>
          </div>
        </div>
        <div>
          <div className="label" style={{marginBottom:8}}>Chips (~32px)</div>
          <div style={{display:'flex',gap:6}}>
            <span className="chip active">Active</span>
            <span className="chip">Inactive</span>
            <span className="chip success">Available</span>
            <span className="chip danger">URGENT</span>
          </div>
        </div>
        <div>
          <div className="label" style={{marginBottom:8}}>Status badges</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <span className="badge open"><span className="dot"></span>Open</span>
            <span className="badge pending"><span className="dot"></span>Pending</span>
            <span className="badge accepted"><span className="dot"></span>Accepted</span>
            <span className="badge done"><span className="dot"></span>Done</span>
          </div>
        </div>
      </div>

      <p style={{color:'var(--text-2)',fontSize:13,lineHeight:1.6,maxWidth:760,marginTop:24}}>
        Primary action color is <b>black</b> across the app. The brand <b>indigo accent</b> appears only for verified-shield icons,
        certain selection states, and brand moments. Rate / money values use the <b>money green</b>. Yellow is reserved for the
        single concept of "Pending / Soon"; red for "Urgent / Danger / Action required". Loading uses skeletons; empty uses a
        calm icon + short title + optional CTA.
      </p>
    </div>
  );
}

Object.assign(window, {
  DashboardScreen, MarketplaceScreen, WorkerProfileScreen, FindWorkScreen,
  PostJobScreen, ActivityScreen, JobDetailScreen, ProfileScreen, TokensSheet,
});
