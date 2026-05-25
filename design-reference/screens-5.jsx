/* ─── Phase 5 mockups · Utility + Legal + Secondary ─── */

/* 30 — Wallet */
function WalletScreen(){
  const txs = [
    {credit:true,  reason:"Job payment · Pipe leak repair",       date:"2 days ago", amt:600},
    {credit:false, reason:"Booking commission",                    date:"3 days ago", amt:30},
    {credit:true,  reason:"Referral bonus · Manoj joined",         date:"5 days ago", amt:50, expDays:84},
    {credit:true,  reason:"Job payment · Bathroom tap",            date:"1 week ago", amt:400},
  ];
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px'}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:-8}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{fontWeight:700,fontSize:18}}>Wallet</span>
      </div>
      <div className="scroll" style={{padding:'0 0 80px',height:'calc(100% - 28px - 56px)'}}>
        <div style={{background:'var(--primary)',color:'#fff',borderRadius:16,padding:24,textAlign:'center',margin:16}}>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Balance</div>
          <div style={{fontSize:44,fontWeight:700,letterSpacing:-1,marginVertical:6}}>₹1,250</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginTop:4}}>Credits expire 90 days after earning</div>
        </div>

        <div className="card" style={{margin:'0 16px 16px',display:'flex',alignItems:'center',gap:14,padding:16}}>
          <div className="grow">
            <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>Refer a friend</div>
            <div className="meta" style={{marginBottom:10}}>You get ₹50, they get ₹50</div>
            <div className="row gap-8" style={{flexWrap:'wrap'}}>
              <span style={{padding:'6px 10px',background:'var(--surface)',borderRadius:8,fontWeight:700,fontSize:15,letterSpacing:1.5}}>RAMESH50</span>
              <button className="btn" style={{minHeight:36,padding:'0 12px',fontSize:12}}><i className="ion-ios-share"></i> Share</button>
            </div>
          </div>
          <i className="ion-ios-gift" style={{fontSize:36}}></i>
        </div>

        <div className="ctitle" style={{marginLeft:16}}>Transactions</div>
        {txs.map((t,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
            <div style={{width:36,height:36,borderRadius:10,background:t.credit?'var(--success-bg)':'var(--danger-bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className={`ion-ios-arrow-${t.credit?'down':'up'}`} style={{fontSize:18,color:t.credit?'var(--success)':'var(--danger)'}}></i>
            </div>
            <div className="grow">
              <div style={{fontWeight:700,fontSize:14}}>{t.reason}</div>
              <div className="meta" style={{marginTop:2}}>{t.date}</div>
              {t.expDays && <div className="meta" style={{marginTop:2}}>Expires in {t.expDays} days</div>}
            </div>
            <div style={{fontWeight:700,fontSize:15,color:t.credit?'var(--success)':'var(--danger)'}}>{t.credit?'+':'−'}₹{t.amt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 31 — Calendar */
function CalendarScreen(){
  // build a fake May calendar with some highlighted days
  const days = [];
  for (let i=0; i<2; i++) days.push(null);
  for (let d=1; d<=31; d++) days.push(d);
  const today = 26;
  const selected = 28;
  const events = { 8:["s"], 14:["s"], 18:["s"], 22:["s","s"], 28:["w","w"], 30:["w"] };
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div className="scroll" style={{height:'calc(100% - 28px)'}}>
        {/* Hero */}
        <div style={{background:'var(--primary)',color:'#fff',padding:'20px 24px 24px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',width:200,height:200,borderRadius:100,background:'rgba(255,255,255,0.05)',top:-50,right:-50}}></div>
          <div style={{fontSize:22,fontWeight:700,letterSpacing:-0.3,marginBottom:4}}>My Work Calendar</div>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:1,marginBottom:20}}>May 2026</div>
          <div style={{display:'flex',background:'rgba(255,255,255,0.1)',borderRadius:14,padding:'14px 8px'}}>
            {[
              {icon:"briefcase-outline",val:"4",lbl:"Jobs done"},
              {icon:"cash-outline",val:"₹14,500",lbl:"Earned"},
              {icon:"time-outline",val:"2",lbl:"Upcoming"},
            ].map((s,i)=>(
              <React.Fragment key={s.lbl}>
                {i>0 && <div style={{width:1,background:'rgba(255,255,255,0.2)'}}></div>}
                <div style={{flex:1,textAlign:'center'}}>
                  <i className={`ion-ios-${s.icon}`} style={{fontSize:16,color:'rgba(255,255,255,0.7)'}}></i>
                  <div style={{fontWeight:700,fontSize:16,marginTop:6}}>{s.val}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.7)'}}>{s.lbl}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Calendar card */}
        <div className="card" style={{margin:16,padding:16}}>
          <div className="row between mb-12">
            <div style={{width:40,height:40,borderRadius:12,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{fontSize:18}}></i></div>
            <span style={{fontWeight:700,fontSize:16}}>May 2026</span>
            <div style={{width:40,height:40,borderRadius:12,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-forward" style={{fontSize:18}}></i></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:8}}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>(<div key={d} style={{textAlign:'center',fontWeight:700,fontSize:10,letterSpacing:0.6,color:'var(--text-3)'}}>{d}</div>))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
            {days.map((d,i)=>{
              if (!d) return <div key={i} style={{aspectRatio:'1'}}></div>;
              const isToday = d===today;
              const isSel = d===selected;
              const ev = events[d];
              return (
                <div key={i} style={{aspectRatio:'1',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:isSel?'var(--primary)':isToday?'var(--surface)':'transparent',borderRadius:10,color:isSel?'#fff':'var(--text)',fontWeight:isSel||isToday?700:600,fontSize:13}}>
                  {d}
                  {ev && !isSel && <div style={{display:'flex',gap:2,marginTop:2}}>{ev.map((e,j)=>(<div key={j} style={{width:5,height:5,borderRadius:3,background:e==='w'?'var(--warning)':'var(--success)'}}></div>))}</div>}
                </div>
              );
            })}
          </div>
          <div className="row gap-10" style={{flexWrap:'wrap',marginTop:14,paddingTop:14,borderTop:'1px solid var(--border)'}}>
            {[
              {c:'var(--success)',l:'Accepted'},
              {c:'var(--warning)',l:'Pending'},
              {c:'var(--success)',l:'Completed'},
              {c:'var(--text-3)', l:'Cancelled'},
            ].map(l=>(<div key={l.l} className="row gap-4"><div style={{width:8,height:8,borderRadius:4,background:l.c}}></div><span className="meta">{l.l}</span></div>))}
          </div>
        </div>

        {/* Selected day */}
        <div style={{padding:'0 16px 60px'}}>
          <div style={{fontWeight:700,fontSize:18,marginBottom:12,letterSpacing:-0.2}}>Thursday, 28 May</div>
          <div className="card" style={{borderLeft:'4px solid var(--warning)',marginBottom:10}}>
            <div className="row between mb-8">
              <span style={{fontWeight:700,fontSize:15,flex:1}}>Painter — 2BHK interior</span>
              <span style={{padding:'4px 10px',borderRadius:999,background:'var(--warning-bg)',color:'var(--warning)',fontWeight:700,fontSize:10,letterSpacing:0.5}}>PENDING</span>
            </div>
            <div className="sm" style={{color:'var(--text-2)'}}>₹700/day · Customer: Anjali D.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 32 — Map */
function MapScreen(){
  return (
    <div className="scr" style={{background:'#dfe5d8'}}>
      <window.StatusBar2/>
      {/* fake map background */}
      <div style={{position:'absolute',inset:'28px 0 0',background:'linear-gradient(135deg,#e7e9d3,#cdd9c0)'}}>
        {/* fake roads */}
        <div style={{position:'absolute',top:120,left:0,right:0,height:6,background:'rgba(255,255,255,0.6)'}}></div>
        <div style={{position:'absolute',top:380,left:0,right:0,height:8,background:'rgba(255,255,255,0.75)'}}></div>
        <div style={{position:'absolute',top:0,bottom:0,left:160,width:6,background:'rgba(255,255,255,0.6)'}}></div>
        <div style={{position:'absolute',top:0,bottom:0,left:260,width:5,background:'rgba(255,255,255,0.55)'}}></div>
        {/* pins */}
        {[
          {x:80, y:180, on:true},
          {x:170, y:300, on:false},
          {x:240, y:220, on:true},
          {x:100, y:480, on:true},
          {x:280, y:520, on:false},
          {x:200, y:620, on:true},
        ].map((p,i)=>(
          <div key={i} style={{position:'absolute',left:p.x,top:p.y,width:32,height:32,borderRadius:16,background:p.on?'var(--success)':'var(--primary)',border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 4px rgba(0,0,0,0.25)'}}>
            <i className="ion-ios-person" style={{color:'#fff',fontSize:14}}></i>
          </div>
        ))}
        {/* selected callout */}
        <div style={{position:'absolute',left:130,top:140,width:170,padding:12,background:'#fff',borderRadius:12,boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>
          <div style={{fontWeight:700,fontSize:14}}>Suresh Kumar</div>
          <div className="meta" style={{marginTop:2}}>Plumber · Pipe fitting</div>
          <div style={{fontWeight:700,fontSize:13,color:'var(--success)',marginTop:4}}>₹600/day</div>
          <div style={{fontWeight:700,fontSize:12,color:'var(--text)',marginTop:6}}>View profile →</div>
        </div>
      </div>

      {/* Locate FAB */}
      <div style={{position:'absolute',right:16,bottom:28,width:48,height:48,borderRadius:24,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
        <i className="ion-ios-locate" style={{fontSize:22}}></i>
      </div>
    </div>
  );
}

/* 33 — Terms */
function TermsScreen(){
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div className="scroll body" style={{height:'calc(100% - 28px - 84px)',paddingBottom:24}}>
        <div className="label">Version 2.1 · Effective May 15, 2026</div>
        <div className="h1" style={{fontSize:24,marginTop:16,marginBottom:16}}>Terms of Service</div>
        <div style={{fontSize:15,color:'var(--text)',lineHeight:1.6,marginBottom:16}}>
          Welcome to KaamNow. By using our platform, you agree to these terms. KaamNow is a marketplace connecting customers with local service experts across India.
        </div>
        <div style={{fontWeight:700,fontSize:16,marginTop:20,marginBottom:10}}>1. Account Registration</div>
        <div style={{fontSize:15,color:'var(--text-2)',lineHeight:1.6,marginBottom:16}}>
          You must be at least 18 years old to register. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate.
        </div>
        <div style={{fontWeight:700,fontSize:16,marginTop:20,marginBottom:10}}>2. Service Use</div>
        <div style={{fontSize:15,color:'var(--text-2)',lineHeight:1.6,marginBottom:16}}>
          KaamNow facilitates connections between customers and Local Experts. We are not a party to any agreement between users and do not guarantee the quality, safety, or legality of services arranged through the platform.
        </div>
        <div style={{fontWeight:700,fontSize:16,marginTop:20,marginBottom:10}}>3. Payments and Fees</div>
        <div style={{fontSize:15,color:'var(--text-2)',lineHeight:1.6}}>
          Payments between customers and experts are arranged directly. KaamNow may charge a small booking commission on successful engagements, which is shown to both parties before confirmation.
        </div>
      </div>
      <div className="sticky">
        <button className="btn btn-block btn-lg">Accept & Continue</button>
      </div>
    </div>
  );
}

/* 34 — Privacy */
function PrivacyScreen(){
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div className="scroll body" style={{height:'calc(100% - 28px)',paddingBottom:24}}>
        <div className="label">Version 1.4 · Effective April 30, 2026</div>
        <div className="h1" style={{fontSize:24,marginTop:16,marginBottom:16}}>Privacy Policy</div>
        <div style={{fontSize:15,color:'var(--text)',lineHeight:1.6,marginBottom:16}}>
          Your privacy matters. This policy describes how KaamNow collects, uses, and protects your data.
        </div>
        <div style={{fontWeight:700,fontSize:16,marginTop:20,marginBottom:10}}>What we collect</div>
        <div style={{fontSize:15,color:'var(--text-2)',lineHeight:1.6,marginBottom:16}}>
          Phone number, name, location (with permission), service preferences, and messages you exchange on the platform.
        </div>
        <div style={{fontWeight:700,fontSize:16,marginTop:20,marginBottom:10}}>How we use it</div>
        <div style={{fontSize:15,color:'var(--text-2)',lineHeight:1.6,marginBottom:16}}>
          To match you with relevant experts or jobs, send OTP and booking notifications via WhatsApp/SMS, and improve our matching algorithms.
        </div>
        <div style={{fontWeight:700,fontSize:16,marginTop:20,marginBottom:10}}>What we never do</div>
        <div style={{fontSize:15,color:'var(--text-2)',lineHeight:1.6}}>
          We never sell your data to third parties. We never share your phone number publicly. Your booking history stays private to you and the people involved.
        </div>
      </div>
    </div>
  );
}

/* 35 — Worker Job Feed */
function WorkerJobFeedScreen(){
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{background:'var(--primary)',color:'#fff',padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
        <i className="ion-ios-star" style={{fontSize:18,color:'#fff'}}></i>
        <div className="grow">
          <div style={{fontWeight:700,fontSize:13}}>Become a Local Expert</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.75)'}}>Get more job alerts in your area</div>
        </div>
        <i className="ion-ios-arrow-forward" style={{color:'#fff'}}></i>
      </div>
      <div style={{padding:'12px 16px 8px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
        <div className="label">Find Work</div>
        <div className="h2" style={{fontSize:22,marginTop:4}}>Jobs near you</div>
        <div className="searchbar mt-12" style={{borderRadius:12,height:52,background:'var(--surface)'}}>
          <i className="ion-ios-search-strong" style={{fontSize:18,color:'var(--text-3)'}}></i>
          <input placeholder="Search jobs by skill or place..."/>
        </div>
        <div style={{display:'flex',gap:8,marginTop:12,overflowX:'auto',paddingBottom:4}}>
          {["All","Today","Urgent","Mason","Painter"].map((p,i)=>(<span key={p} className={`chip ${i===0?'active':''}`} style={{whiteSpace:'nowrap'}}>{p}</span>))}
        </div>
      </div>
      <div className="scroll" style={{padding:'12px 16px 80px',height:'calc(100% - 28px - 48px - 168px)'}}>
        <div className="row between mb-12"><span style={{fontWeight:700,fontSize:16}}>8 jobs near you</span><span className="meta">Updated 2m ago</span></div>
        {[
          {title:"Need 2 masons for boundary wall",poster:"Ramesh G.",rating:4.7,loc:"Pratapgarh · 5 km",rate:500,date:"Tomorrow",urgency:"URGENT"},
          {title:"Painter for shop signage",poster:"Anjali D.",rating:4.4,loc:"Wardha · 3 km",rate:700,date:"Sat 28 May",urgency:null,applied:true},
        ].map(j=>(
          <div key={j.title} className="card mb-12">
            <div className="row gap-8 mb-12">
              <div className="avatar sm" style={{borderRadius:9}}>{j.poster[0]}</div>
              <div className="grow">
                <div style={{fontWeight:700,fontSize:14}}>{j.poster}</div>
                <div className="row gap-4 mt-8"><i className="ion-ios-star star" style={{fontSize:13}}></i><span style={{color:'var(--text-2)',fontSize:12}}>{j.rating.toFixed(1)}</span></div>
              </div>
              {j.urgency && <span className="chip danger">{j.urgency}</span>}
            </div>
            <div className="h4" style={{marginBottom:10}}>{j.title}</div>
            <div className="row gap-12 mb-12" style={{color:'var(--text-2)',fontSize:13,flexWrap:'wrap'}}>
              <span className="row gap-4"><i className="ion-ios-pin"></i> {j.loc}</span>
              <span className="row gap-4"><i className="ion-ios-calendar"></i> {j.date}</span>
            </div>
            <div className="row between" style={{borderTop:'1px solid var(--border)',paddingTop:14}}>
              <div>
                <div className="label">Daily rate</div>
                <div style={{fontWeight:700,fontSize:18,color:'var(--money)'}}>₹{j.rate}<span style={{color:'var(--text-3)',fontSize:12,fontWeight:400}}>/day</span></div>
              </div>
              {j.applied
                ? <button className="btn btn-outline" style={{minWidth:120}}>Pending</button>
                : <button className="btn" style={{minWidth:120}}>Apply</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 36 — WhatsApp Demo (preserved) */
function WhatsAppDemoScreen(){
  return (
    <div className="scr" style={{background:'#075E54'}}>
      <window.StatusBarOnDark/>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',background:'#075E54',color:'#fff'}}>
        <div style={{width:36,height:36,borderRadius:18,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{color:'#fff',fontSize:22}}></i></div>
        <div style={{width:36,height:36,borderRadius:18,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>KN</div>
        <div className="grow">
          <div style={{fontWeight:700,fontSize:15}}>KaamNow Bot</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.8)'}}>Demo · WhatsApp</div>
        </div>
        <span style={{fontWeight:700,fontSize:12,textDecoration:'underline'}}>Reset</span>
      </div>
      <div style={{flex:1,background:'#F5F4EF',padding:16,display:'flex',flexDirection:'column',gap:8,minHeight:0,overflow:'auto'}}>
        <div style={{maxWidth:'78%',background:'#fff',padding:'10px 14px',borderRadius:16,borderBottomLeftRadius:4,boxShadow:'0 1px 1px rgba(0,0,0,0.08)'}}>
          <div style={{fontSize:14,lineHeight:1.4}}>Namaste 🙏 KaamNow par swagat hai!</div>
          <div style={{fontSize:14,lineHeight:1.4,marginTop:6}}>Aap kya khoj rahe hain?</div>
          <div style={{fontSize:10,color:'#888',textAlign:'right',marginTop:4}}>9:30 AM</div>
        </div>
        <div style={{alignSelf:'flex-end',maxWidth:'78%',background:'#DCF8C6',padding:'10px 14px',borderRadius:16,borderBottomRightRadius:4}}>
          <div style={{fontSize:14,lineHeight:1.4}}>Plumber chahiye</div>
          <div style={{fontSize:10,color:'#5a8a4a',textAlign:'right',marginTop:4}}>9:30 AM ✓✓</div>
        </div>
        <div style={{maxWidth:'82%',background:'#fff',padding:'10px 14px',borderRadius:16,borderBottomLeftRadius:4,boxShadow:'0 1px 1px rgba(0,0,0,0.08)'}}>
          <div style={{fontSize:14,lineHeight:1.4}}>Theek hai! Aapka pincode batayein?</div>
          <div style={{fontSize:10,color:'#888',textAlign:'right',marginTop:4}}>9:30 AM</div>
        </div>
        <div style={{alignSelf:'flex-end',maxWidth:'78%',background:'#DCF8C6',padding:'10px 14px',borderRadius:16,borderBottomRightRadius:4}}>
          <div style={{fontSize:14,lineHeight:1.4}}>230001</div>
          <div style={{fontSize:10,color:'#5a8a4a',textAlign:'right',marginTop:4}}>9:31 AM ✓✓</div>
        </div>
      </div>
      <div style={{display:'flex',gap:8,padding:'8px 12px',background:'#f0f0f0',alignItems:'center'}}>
        <div style={{width:36,height:36,borderRadius:18,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-happy-outline" style={{fontSize:20,color:'#888'}}></i></div>
        <div style={{flex:1,background:'#fff',borderRadius:18,padding:'8px 14px',color:'#888'}}>Type a message</div>
        <div style={{width:40,height:40,borderRadius:20,background:'#075E54',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-mic" style={{fontSize:20,color:'#fff'}}></i></div>
      </div>
    </div>
  );
}

Object.assign(window, {
  WalletScreen, CalendarScreen, MapScreen,
  TermsScreen, PrivacyScreen, WorkerJobFeedScreen, WhatsAppDemoScreen,
});
