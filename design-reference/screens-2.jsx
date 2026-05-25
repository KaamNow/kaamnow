/* ─── Phase 2 mockups · Auth + User setup ─── */

const StatusBar2 = () => (
  <div className="status">
    <span className="time">9:41</span>
    <span className="right"><i className="ion-ios-cellular"></i> <i className="ion-ios-wifi"></i> <i className="ion-ios-battery-full"></i></span>
  </div>
);

const StatusBarOnDark = () => (
  <div className="status" style={{color:'#fff'}}>
    <span className="time">9:41</span>
    <span className="right" style={{color:'#fff'}}><i className="ion-ios-cellular"></i> <i className="ion-ios-wifi"></i> <i className="ion-ios-battery-full"></i></span>
  </div>
);

/* 09 — Landing (guest) */
function LandingScreen(){
  return (
    <div className="scr">
      <StatusBar2/>
      <div style={{padding:'8px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:32,height:32,borderRadius:8,background:'var(--primary)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14}}>K</div>
          <span style={{fontWeight:700,fontSize:18}}>KaamNow</span>
        </div>
        <div style={{padding:'8px 12px',borderRadius:999,border:'1px solid var(--border)',background:'#fff',fontWeight:700,fontSize:12}}>EN</div>
      </div>
      <div className="body scroll" style={{height:'calc(100% - 28px - 48px)'}}>
        <div className="label" style={{marginBottom:8}}>Work · Earn · Grow</div>
        <div className="h1" style={{fontSize:30,lineHeight:1.15,letterSpacing:-1}}>Hire skilled workers<br/>near you</div>
        <div className="sm" style={{color:'var(--text-2)',marginTop:8,marginBottom:20}}>Verified Local Experts — matched in minutes</div>

        <div style={{position:'relative',borderRadius:14,overflow:'hidden',height:200,marginBottom:12,background:'linear-gradient(135deg,#3a3f48,#1c1f25)'}}>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.7),transparent 60%)'}}></div>
          <div style={{position:'absolute',left:16,right:16,bottom:16,color:'#fff'}}>
            <div style={{fontWeight:700,fontSize:18}}>Need an Expert?</div>
            <div style={{fontSize:12,opacity:.85,marginBottom:10}}>Find verified local professionals</div>
            <button className="btn" style={{background:'#fff',color:'var(--text)'}}>Book Local Expert</button>
          </div>
        </div>
        <div style={{position:'relative',borderRadius:14,overflow:'hidden',height:200,marginBottom:20,background:'linear-gradient(135deg,#5a5050,#2a2424)'}}>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.75),transparent 60%)'}}></div>
          <div style={{position:'absolute',left:16,right:16,bottom:16,color:'#fff'}}>
            <div style={{fontWeight:700,fontSize:18}}>Need Work?</div>
            <div style={{fontSize:12,opacity:.85,marginBottom:10}}>Find premium jobs near you</div>
            <button className="btn" style={{background:'transparent',color:'#fff',border:'1px solid rgba(255,255,255,0.5)'}}>Join as Partner</button>
          </div>
        </div>

        <div className="h3" style={{marginBottom:12}}>Popular categories</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
          {["Mason","Electrician","Farming","Cleaning","Plumber","Carpenter"].map((c,i)=>(
            <div key={c} style={{aspectRatio:'1',borderRadius:12,background:`linear-gradient(135deg,${['#5a6a4a','#3d4a58','#4a6a3a','#5a7a78','#3d4a58','#7a5a3a'][i]},#2c2c30)`,position:'relative',color:'#fff'}}>
              <div style={{position:'absolute',left:10,bottom:8,fontWeight:700,fontSize:13}}>{c}</div>
            </div>
          ))}
        </div>

        <div style={{position:'sticky',bottom:0,background:'var(--bg)',paddingBottom:8}}>
          <button className="btn btn-block btn-lg">Join Free</button>
          <button className="btn btn-outline btn-block" style={{marginTop:8}}>Sign in</button>
        </div>
      </div>
    </div>
  );
}

/* 10 — Login (OTP step) */
function LoginScreen(){
  return (
    <div className="scr" style={{background:'var(--primary)'}}>
      <StatusBarOnDark/>
      <div style={{padding:'8px 24px 32px',color:'#fff'}}>
        <div style={{width:40,height:40,borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,marginLeft:-8}}>
          <i className="ion-ios-arrow-back" style={{color:'rgba(255,255,255,0.9)',fontSize:22}}></i>
        </div>
        <div style={{fontSize:13,letterSpacing:1,opacity:.5,fontWeight:700,marginBottom:12}}>KAAMNOW</div>
        <div style={{fontSize:28,fontWeight:700,letterSpacing:-.5,marginBottom:8}}>Enter the code</div>
        <div style={{fontSize:15,color:'rgba(255,255,255,0.65)',lineHeight:1.5}}>We sent a 6-digit code to +91 XXXXX-43210</div>
      </div>
      <div style={{flex:1,background:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,padding:'28px 24px 40px',marginTop:-4,height:'100%'}}>
        <div className="card mb-20" style={{background:'var(--success-bg)',borderColor:'transparent'}}>
          <div className="row gap-10" style={{alignItems:'flex-start'}}>
            <i className="ion-logo-whatsapp" style={{color:'var(--success)',fontSize:18,marginTop:2}}></i>
            <div className="grow">
              <div style={{fontWeight:700,fontSize:13,color:'var(--success)'}}>OTP arrives on WhatsApp</div>
              <div className="meta" style={{color:'var(--text-2)',marginTop:2}}>First time: tap below, send 'Hi', then come back.</div>
            </div>
            <span style={{fontWeight:700,fontSize:12,color:'var(--success)'}}>Open →</span>
          </div>
        </div>

        <div style={{display:'flex',gap:8,justifyContent:'space-between',marginBottom:16}}>
          {["1","4","7","2","0","8"].map((d,i)=>(
            <div key={i} style={{flex:1,maxWidth:52,height:58,borderRadius:12,background:i<3?'#fff':'var(--surface-muted)',border:i<3?'1px solid var(--primary)':'1px solid transparent',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:22,color:'var(--text)'}}>{d}</div>
          ))}
        </div>
        <div className="meta mb-24">Check your WhatsApp for the code</div>
        <button className="btn btn-block btn-lg">Verify & Sign In</button>
        <div className="row gap-4" style={{justifyContent:'center',marginTop:24}}>
          <span className="sm" style={{color:'var(--text-2)'}}>Wrong number?</span>
          <span style={{fontWeight:700,fontSize:14,textDecoration:'underline'}}>Change</span>
        </div>
      </div>
    </div>
  );
}

/* 11 — Phone signup (step 1) */
function PhoneSignupScreen(){
  return (
    <div className="scr" style={{background:'var(--primary)'}}>
      <StatusBarOnDark/>
      <div style={{padding:'8px 24px 32px',color:'#fff'}}>
        <div style={{width:40,height:40,borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,marginLeft:-8}}>
          <i className="ion-ios-arrow-back" style={{color:'rgba(255,255,255,0.9)',fontSize:22}}></i>
        </div>
        <div style={{fontSize:13,letterSpacing:1,opacity:.5,fontWeight:700,marginBottom:12}}>KAAMNOW</div>
        <div style={{fontSize:28,fontWeight:700,letterSpacing:-.5,marginBottom:8}}>Create account 🙏</div>
        <div style={{fontSize:15,color:'rgba(255,255,255,0.65)',lineHeight:1.5}}>Enter your mobile number to get started</div>
      </div>
      <div style={{flex:1,background:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,padding:'28px 24px 40px',marginTop:-4,height:'100%'}}>
        <div style={{display:'flex',alignItems:'center',background:'var(--surface-muted)',borderRadius:12,overflow:'hidden',minHeight:56,marginBottom:8}}>
          <div style={{padding:'16px 16px',fontWeight:700,fontSize:15}}>🇮🇳 +91</div>
          <input style={{flex:1,padding:'16px 6px',border:0,background:'transparent',outline:'none',fontSize:17,fontWeight:600,letterSpacing:1.5}} defaultValue="98765 43210"/>
        </div>
        <div className="row gap-4 mb-24"><i className="ion-logo-whatsapp" style={{color:'var(--success)',fontSize:13}}></i><span className="meta">OTP will arrive on WhatsApp</span></div>
        <button className="btn btn-block btn-lg">Send OTP</button>
        <div className="row gap-4" style={{justifyContent:'center',marginTop:24}}>
          <span className="sm" style={{color:'var(--text-2)'}}>Already have an account?</span>
          <span style={{fontWeight:700,fontSize:14,textDecoration:'underline'}}>Sign In</span>
        </div>
      </div>
    </div>
  );
}

/* 12 — Edit Profile */
function EditProfileScreen(){
  return (
    <div className="scr">
      <StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'10px 16px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-close" style={{fontSize:22}}></i></div>
        <span style={{flex:1,fontWeight:700,fontSize:17,marginLeft:8}}>Edit Profile</span>
        <button className="btn" style={{minHeight:40,padding:'0 18px',fontSize:13,borderRadius:999}}>Save</button>
      </div>
      <div className="scroll" style={{padding:16,height:'calc(100% - 28px - 60px)'}}>
        <div className="label" style={{marginBottom:8,marginTop:8}}>Full Name *</div>
        <input className="input mb-12" defaultValue="Ramesh Gupta"/>

        <div className="label" style={{marginBottom:8}}>Phone</div>
        <div className="input mb-8" style={{display:'flex',alignItems:'center',justifyContent:'space-between',color:'var(--text-3)'}}>+91 98765 43210<i className="ion-ios-lock" style={{fontSize:14}}></i></div>
        <div className="meta mb-16">Phone number cannot be changed here.</div>

        <div className="label" style={{marginBottom:8}}>Gender</div>
        <div style={{display:'flex',gap:8,marginBottom:20}}>
          <span className="chip active" style={{flex:1,justifyContent:'center',minHeight:48}}>Male</span>
          <span className="chip" style={{flex:1,justifyContent:'center',minHeight:48}}>Female</span>
          <span className="chip" style={{flex:1,justifyContent:'center',minHeight:48}}>Other</span>
        </div>

        <div className="label" style={{marginBottom:8}}>Pincode</div>
        <input className="input mb-16" defaultValue="230001"/>

        <div className="row between mb-8" style={{alignItems:'center'}}>
          <span className="label" style={{margin:0}}>Bio</span>
          <span style={{display:'inline-flex',alignItems:'center',gap:6,background:'var(--accent-tint)',padding:'6px 12px',borderRadius:999,fontSize:12,fontWeight:700,color:'var(--accent)'}}>
            <i className="ion-ios-sparkles"></i> Generate with AI
          </span>
        </div>
        <textarea className="input" style={{minHeight:120,padding:'14px 16px',resize:'none',fontFamily:'inherit',textAlignVertical:'top'}} defaultValue="6 years of hands-on plumbing experience across residential sites. Polite, on-time, brings own basic tools."></textarea>
        <div className="meta" style={{textAlign:'right',marginTop:6}}>118 / 300</div>
      </div>
    </div>
  );
}

/* 13 — Edit Photo */
function EditPhotoScreen(){
  return (
    <div className="scr" style={{display:'flex',flexDirection:'column'}}>
      <StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'10px 16px'}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
        <div className="avatar bg-2" style={{width:160,height:160,borderRadius:80,fontSize:60,marginBottom:24}}>R</div>
        <div style={{fontWeight:700,fontSize:20,marginBottom:8}}>Your photo</div>
        <div className="meta" style={{textAlign:'center',lineHeight:1.5,maxWidth:280,marginBottom:32}}>Square photos look best. Show your face clearly — customers want to recognize who's coming.</div>
        <button className="btn btn-lg" style={{minWidth:200}}>Choose new photo</button>
      </div>
    </div>
  );
}

/* 14 — Address Form */
function AddressFormScreen(){
  return (
    <div className="scr">
      <StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'10px 16px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{flex:1,fontWeight:700,fontSize:18,marginLeft:8}}>Add Address</span>
        <button className="btn" style={{minHeight:40,padding:'0 20px',fontSize:13,borderRadius:999}}>Save</button>
      </div>
      <div className="scroll" style={{padding:16,height:'calc(100% - 28px - 60px)'}}>
        <div className="label" style={{marginBottom:10,marginTop:8}}>LABEL</div>
        <div className="row gap-8 mb-16" style={{flexWrap:'wrap'}}>
          <span className="chip active"><i className="ion-ios-home"></i> Home</span>
          <span className="chip"><i className="ion-ios-briefcase"></i> Work</span>
          <span className="chip"><i className="ion-ios-hammer"></i> Site</span>
          <span className="chip">Other</span>
        </div>

        <div className="label" style={{marginBottom:10}}>STREET / FLAT (OPTIONAL)</div>
        <input className="input mb-16" placeholder="e.g. Flat 3B, Krishna Nagar"/>

        <div className="label" style={{marginBottom:10}}>PINCODE *</div>
        <div className="row gap-8 mb-12">
          <div className="input grow" style={{display:'flex',alignItems:'center',gap:10,paddingTop:0,paddingBottom:0}}>
            <i className="ion-ios-pin" style={{fontSize:18,color:'var(--text-3)'}}></i>
            <input style={{flex:1,border:0,background:'transparent',fontSize:15,outline:'none'}} defaultValue="230001"/>
            <i className="ion-ios-checkmark-circle" style={{color:'var(--success)',fontSize:18}}></i>
          </div>
          <div style={{width:52,height:52,borderRadius:12,background:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <i className="ion-ios-locate" style={{color:'#fff',fontSize:20}}></i>
          </div>
        </div>

        <div className="card mb-16" style={{display:'flex',alignItems:'center',gap:8,padding:12,background:'var(--success-bg)',borderColor:'transparent'}}>
          <i className="ion-ios-pin" style={{color:'var(--success)',fontSize:16}}></i>
          <span className="sm" style={{color:'var(--success)',fontWeight:600,flex:1}}>Pratapgarh, Uttar Pradesh</span>
        </div>

        <div className="label" style={{marginBottom:10}}>VILLAGE / AREA</div>
        <input className="input mb-24" placeholder="e.g. Sector 12"/>

        <div className="card" style={{display:'flex',alignItems:'center',gap:14,padding:16}}>
          <div style={{width:40,height:40,borderRadius:12,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-star" style={{fontSize:18}}></i></div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14}}>Set as default address</div>
            <div className="meta" style={{marginTop:2}}>Auto-filled when you post a new job</div>
          </div>
          <div style={{width:44,height:24,borderRadius:12,background:'var(--success)',position:'relative'}}>
            <div style={{position:'absolute',right:2,top:2,width:20,height:20,borderRadius:10,background:'#fff'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 15 — Saved Addresses */
function SavedAddressesScreen(){
  return (
    <div className="scr">
      <StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'10px 16px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{flex:1,fontWeight:700,fontSize:18,marginLeft:8}}>Saved Addresses</span>
        <div style={{width:36,height:36,borderRadius:18,background:'var(--primary)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-add" style={{fontSize:22}}></i></div>
      </div>
      <div className="body scroll" style={{height:'calc(100% - 28px - 60px)'}}>
        {[
          {icon:"home",label:"Home",addr:"Krishna Nagar, Pratapgarh, UP, 230001",def:true},
          {icon:"briefcase",label:"Work",addr:"Sector 18, Noida, UP, 201301",def:false},
          {icon:"hammer",label:"Site",addr:"Boundary wall job, Wardha, MH",def:false},
        ].map(a=>(
          <div key={a.label} className="card mb-12" style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:44,height:44,borderRadius:12,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className={`ion-ios-${a.icon}`} style={{fontSize:20}}></i></div>
            <div className="grow">
              <div className="row gap-8" style={{marginBottom:4}}>
                <span style={{fontWeight:700,fontSize:14}}>{a.label}</span>
                {a.def && <span className="chip success" style={{padding:'2px 8px',fontSize:9,fontWeight:700,letterSpacing:0.5}}>★ DEFAULT</span>}
              </div>
              <div className="meta" style={{lineHeight:1.4}}>{a.addr}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <div style={{width:32,height:32,borderRadius:10,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-create" style={{fontSize:14}}></i></div>
              <div style={{width:32,height:32,borderRadius:10,background:'var(--danger-bg)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-trash" style={{fontSize:14,color:'var(--danger)'}}></i></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  LandingScreen, LoginScreen, PhoneSignupScreen,
  EditProfileScreen, EditPhotoScreen, AddressFormScreen, SavedAddressesScreen,
  StatusBar2, StatusBarOnDark,
});
