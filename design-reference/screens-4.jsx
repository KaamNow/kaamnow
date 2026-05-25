/* ─── Phase 4 mockups · Communication + Support ─── */

const tonedAvatar = (l) => {
  const tones = ["#4A5568", "#5A4E7C", "#3F37C9", "#4D6A52", "#7C4E3D", "#6B4A6E"];
  return tones[(l.charCodeAt(0) || 0) % tones.length];
};

const TonedAvatar = ({letter, size=46}) => (
  <div style={{width:size,height:size,borderRadius:12,background:tonedAvatar(letter),color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:size*0.38,flexShrink:0}}>{letter}</div>
);

/* 24 — ChatsList */
function ChatsListScreen(){
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px'}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:-8}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{flex:1,fontWeight:700,fontSize:22}}>Messages</span>
      </div>
      <div className="scroll" style={{height:'calc(100% - 28px - 56px)'}}>
        {/* Incoming */}
        <div style={{padding:'22px 16px 8px'}}>
          <div className="label">Incoming Requests · 2</div>
        </div>
        <div style={{padding:'14px 16px',background:'#fff',display:'flex',gap:12}}>
          <div style={{position:'relative'}}>
            <TonedAvatar letter="R"/>
            <div style={{position:'absolute',bottom:1,right:1,width:12,height:12,borderRadius:6,background:'var(--warning)',border:'2px solid #fff'}}></div>
          </div>
          <div className="grow">
            <div className="row between" style={{marginBottom:2}}>
              <span style={{fontWeight:700,fontSize:15}}>Ramesh G.</span>
              <span className="meta">5m</span>
            </div>
            <div className="row gap-6 mb-12">
              <span style={{fontWeight:600,fontSize:12,color:'var(--text-2)'}}>Need a quick plumber tonight</span>
              <span className="chip" style={{padding:'2px 8px',fontSize:9,letterSpacing:0.5}}>YOU POSTED</span>
            </div>
            <div className="row gap-8">
              <button className="btn" style={{flex:1,minHeight:44,fontSize:13}}><i className="ion-ios-checkmark"></i> Accept</button>
              <button className="btn btn-secondary" style={{flex:1,minHeight:44,fontSize:13}}>Decline</button>
              <span style={{padding:'12px 8px',fontWeight:600,fontSize:12,color:'var(--text-2)'}}>Details →</span>
            </div>
          </div>
        </div>
        <div style={{height:1,background:'var(--border)',marginLeft:78}}></div>

        {/* Active */}
        <div style={{padding:'22px 16px 8px'}}>
          <div className="label">Active Chats</div>
        </div>
        {[
          {name:"Suresh K.",letter:"S",job:"Pipe leak repair",last:"You: I'll be there by 5",time:"3m"},
          {name:"Anjali D.", letter:"A",job:"Painter for 2BHK",last:"Site address: Sector 12...",time:"1h"},
        ].map(c=>(
          <div key={c.name} style={{padding:'14px 16px',background:'#fff',display:'flex',gap:12,alignItems:'flex-start'}}>
            <div style={{position:'relative'}}>
              <TonedAvatar letter={c.letter}/>
              <div style={{position:'absolute',bottom:1,right:1,width:12,height:12,borderRadius:6,background:'var(--success)',border:'2px solid #fff'}}></div>
            </div>
            <div className="grow">
              <div className="row between" style={{marginBottom:2}}>
                <span style={{fontWeight:700,fontSize:15}}>{c.name}</span>
                <span className="meta">{c.time}</span>
              </div>
              <div className="row gap-6 mb-4">
                <span style={{fontWeight:600,fontSize:12,color:'var(--text-2)'}}>{c.job}</span>
                <span className="chip" style={{padding:'2px 8px',fontSize:9,letterSpacing:0.5}}>WORK I DO</span>
              </div>
              <div className="meta">{c.last}</div>
            </div>
            <i className="ion-ios-arrow-forward" style={{fontSize:16,color:'var(--text-3)',marginTop:14}}></i>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 25 — Chat */
function ChatScreen(){
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'12px 16px',background:'#fff',borderBottom:'1px solid var(--border)',gap:12}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:-8}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <div className="grow" style={{minWidth:0}}>
          <div style={{fontWeight:700,fontSize:16}}>Suresh Kumar</div>
          <div className="meta">Pipe leak repair</div>
        </div>
        <span className="chip success" style={{padding:'4px 10px',fontSize:11}}>Active</span>
      </div>

      {/* Job banner */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:'#fff',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:36,height:36,borderRadius:10,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-briefcase-outline" style={{fontSize:16}}></i></div>
        <div className="grow">
          <div style={{fontWeight:700,fontSize:13}}>Pipe leak repair</div>
          <div className="meta" style={{marginTop:2}}>₹600/day · tap to view</div>
        </div>
        <i className="ion-ios-arrow-forward" style={{fontSize:14,color:'var(--text-3)'}}></i>
      </div>

      <div className="scroll" style={{padding:'12px 16px',height:'calc(100% - 28px - 60px - 60px - 56px - 72px)'}}>
        <div style={{display:'flex',justifyContent:'flex-start',marginBottom:8}}>
          <div style={{maxWidth:'78%',padding:12,background:'#fff',border:'1px solid var(--border)',borderRadius:18,borderBottomLeftRadius:4}}>
            <div style={{fontSize:15,lineHeight:1.4}}>Hi! I can come by today after 3 PM. Material list?</div>
            <div className="meta" style={{textAlign:'right',marginTop:4}}>3:42 PM</div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8}}>
          <div style={{maxWidth:'78%',padding:12,background:'var(--primary)',color:'#fff',borderRadius:18,borderBottomRightRadius:4}}>
            <div style={{fontSize:15,lineHeight:1.4}}>Bring basic plumbing tools. Pipes already at site.</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:4,marginTop:4}}>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.65)'}}>3:43 PM</span>
              <i className="ion-ios-checkmark" style={{fontSize:13,color:'var(--success)'}}></i>
            </div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-start',marginBottom:8}}>
          <div style={{maxWidth:'78%',padding:12,background:'#fff',border:'1px solid var(--border)',borderRadius:18,borderBottomLeftRadius:4}}>
            <div style={{fontSize:15,lineHeight:1.4}}>OK. Coming.</div>
            <div className="meta" style={{textAlign:'right',marginTop:4}}>3:44 PM</div>
          </div>
        </div>
      </div>

      {/* Quick replies */}
      <div style={{display:'flex',gap:8,padding:'10px 14px',background:'#fff',borderTop:'1px solid var(--border)',overflowX:'auto'}}>
        {["I'll confirm by EOD","Share location","What tools?","On the way"].map(q=>(<span key={q} className="chip" style={{whiteSpace:'nowrap',minHeight:36}}>{q}</span>))}
      </div>

      {/* Input bar */}
      <div style={{display:'flex',alignItems:'flex-end',gap:10,padding:'10px 16px 14px',background:'#fff',borderTop:'1px solid var(--border)'}}>
        <input style={{flex:1,minHeight:44,padding:'10px 16px',background:'var(--surface)',borderRadius:22,border:0,fontSize:15,outline:'none'}} placeholder="Type a message…"/>
        <div style={{width:44,height:44,borderRadius:22,background:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <i className="ion-ios-send" style={{color:'#fff',fontSize:18}}></i>
        </div>
      </div>
    </div>
  );
}

/* 26 — Contact Support */
function ContactSupportScreen(){
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div className="scroll body" style={{height:'calc(100% - 28px)'}}>
        <div className="card mb-16" style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:12,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-headset" style={{fontSize:22}}></i></div>
          <div>
            <div style={{fontWeight:700,fontSize:15}}>Kis baat mein madad chahiye?</div>
            <div className="meta" style={{marginTop:2}}>KaamNow team se madad paayein</div>
          </div>
        </div>

        <span style={{display:'inline-flex',alignItems:'center',gap:6,background:'var(--accent-tint)',padding:'7px 12px',borderRadius:999,marginBottom:20}}>
          <i className="ion-ios-person" style={{color:'var(--accent)',fontSize:14}}></i>
          <span style={{fontWeight:700,fontSize:12,color:'var(--accent)'}}>Ramesh Gupta · +91 98765 43210</span>
        </span>

        <div className="h3" style={{marginBottom:12}}>Support se baat karein</div>
        {[
          {icon:"logo-whatsapp",bg:"#E7F8EE",color:"#25D366",title:"WhatsApp Support",sub:"Chat karein — seedha team se"},
          {icon:"ios-call",bg:"var(--surface)",color:"var(--text)",title:"Call Us",sub:"+91 99999 99999 · Mon-Sat 9-6"},
          {icon:"ios-mail",bg:"var(--surface)",color:"var(--text)",title:"Email",sub:"support@kaamnow.com"},
        ].map(s=>(
          <div key={s.title} className="card mb-12" style={{display:'flex',alignItems:'center',gap:14,minHeight:72}}>
            <div style={{width:48,height:48,borderRadius:14,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center'}}><i className={`ion-${s.icon}`} style={{fontSize:22,color:s.color}}></i></div>
            <div className="grow">
              <div style={{fontWeight:700,fontSize:15}}>{s.title}</div>
              <div className="meta" style={{marginTop:3}}>{s.sub}</div>
            </div>
            <i className="ion-ios-arrow-forward" style={{fontSize:16,color:'var(--text-3)'}}></i>
          </div>
        ))}

        <div className="h3 mt-24" style={{marginBottom:12}}>Aksar pooche gaye sawaal</div>
        {[
          {q:"How do I find Local Experts?",a:"Tap 'Find Local Experts' from home, search by skill or village, and tap a Local Expert to send a booking request."},
          {q:"How does the OTP login work?",a:"We send a 6-digit code to your WhatsApp or SMS. Enter the code and you're in — no password needed."},
        ].map(f=>(
          <div key={f.q} className="card mb-12">
            <div className="row gap-8" style={{alignItems:'flex-start',marginBottom:8}}>
              <i className="ion-ios-help-circle-outline" style={{fontSize:16,color:'var(--text-2)',marginTop:1}}></i>
              <span style={{fontWeight:700,fontSize:14,flex:1,lineHeight:1.4}}>{f.q}</span>
            </div>
            <div className="sm" style={{color:'var(--text-2)',lineHeight:1.5,paddingLeft:24}}>{f.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 27 — Support Chat (WebView placeholder) */
function SupportChatScreen(){
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'12px 16px',background:'#fff',borderBottom:'1px solid var(--border)',gap:12}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:-8}}><i className="ion-ios-close" style={{fontSize:22}}></i></div>
        <span style={{flex:1,fontWeight:700,fontSize:16}}>KaamNow Support</span>
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',background:'var(--surface)',padding:16}}>
        <div className="meta" style={{textAlign:'center',padding:'8px 0',marginBottom:12}}>Today · 3:42 PM</div>
        <div style={{maxWidth:'78%',padding:12,background:'#fff',border:'1px solid var(--border)',borderRadius:14,borderBottomLeftRadius:4,marginBottom:8}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>KaamNow Support</div>
          <div style={{fontSize:14,lineHeight:1.4,color:'var(--text)'}}>Hi Ramesh! How can we help you today?</div>
        </div>
        <div style={{alignSelf:'flex-end',maxWidth:'78%',padding:12,background:'var(--primary)',color:'#fff',borderRadius:14,borderBottomRightRadius:4,marginBottom:8}}>
          <div style={{fontSize:14,lineHeight:1.4}}>I need help with my latest payout</div>
        </div>
        <div style={{maxWidth:'78%',padding:12,background:'#fff',border:'1px solid var(--border)',borderRadius:14,borderBottomLeftRadius:4}}>
          <div style={{fontSize:14,lineHeight:1.4}}>Let me check your account. One moment please.</div>
        </div>

        <div style={{flex:1}}></div>
        <div style={{display:'flex',gap:10,padding:'8px 0'}}>
          <input style={{flex:1,minHeight:44,padding:'10px 16px',background:'#fff',border:'1px solid var(--border)',borderRadius:22,fontSize:15,outline:'none'}} placeholder="Reply…"/>
          <div style={{width:44,height:44,borderRadius:22,background:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="ion-ios-send" style={{color:'#fff',fontSize:18}}></i></div>
        </div>
      </div>
    </div>
  );
}

/* 28 — FAQ */
function FAQScreen(){
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{padding:'12px 16px 8px'}}>
        <div className="searchbar" style={{borderRadius:12,height:52}}>
          <i className="ion-ios-search-strong" style={{fontSize:18,color:'var(--text-3)'}}></i>
          <input placeholder="Search questions…" defaultValue=""/>
        </div>
      </div>
      <div className="scroll" style={{padding:'12px 16px 90px',height:'calc(100% - 28px - 72px - 84px)'}}>
        {[
          {cat:"General",items:[
            {q:"How do I find Local Experts near me?",a:"Tap 'Find Local Experts', search by skill or village, and pick one. Send a booking request — they respond on WhatsApp.",open:true},
            {q:"Is KaamNow free for workers?",a:""}
          ]},
          {cat:"For Experts",items:[
            {q:"How do I update my daily rate?",a:""},
            {q:"How does KYC verification work?",a:""},
          ]},
        ].map(s=>(
          <div key={s.cat}>
            <div className="row gap-6" style={{padding:'18px 0 10px'}}>
              <i className="ion-ios-help-circle-outline" style={{fontSize:14,color:'var(--text-3)'}}></i>
              <span className="label">{s.cat}</span>
            </div>
            {s.items.map(it=>(
              <div key={it.q} className="card mb-8" style={{border:`1px solid ${it.open?'var(--text-3)':'var(--border)'}`}}>
                <div className="row gap-8" style={{alignItems:'flex-start'}}>
                  <span style={{fontWeight:700,fontSize:14,lineHeight:1.4,flex:1}}>{it.q}</span>
                  <i className={`ion-ios-${it.open?'remove-circle-outline':'add-circle-outline'}`} style={{fontSize:22,color:it.open?'var(--text)':'var(--text-3)'}}></i>
                </div>
                {it.open && <div className="sm" style={{color:'var(--text-2)',marginTop:10,lineHeight:1.5}}>{it.a}</div>}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="sticky">
        <button className="btn btn-block btn-lg"><i className="ion-ios-chatbubble-ellipses-outline"></i> Chat with Support</button>
      </div>
    </div>
  );
}

/* 29 — Notifications */
function NotificationsScreen(){
  const items = [
    {kind:"booking_request", title:"New booking request", body:"Ramesh G. wants to book your plumbing service for tonight", time:"5m ago", unread:true, ic:"briefcase-outline", color:"var(--warning)", bg:"var(--warning-bg)"},
    {kind:"new_message",     title:"New message",          body:"Suresh K.: I'll be there by 5", time:"12m ago", unread:true, ic:"chatbubble-outline", color:"var(--accent)", bg:"var(--accent-tint)"},
    {kind:"completed",       title:"Job completed",         body:"Boundary wall masonry — leave a review", time:"2h ago", unread:false, ic:"ribbon-outline", color:"var(--success)", bg:"var(--success-bg)"},
    {kind:"rejected",        title:"Request declined",      body:"Manoj Y. declined your booking", time:"Yesterday", unread:false, ic:"close-circle-outline", color:"var(--danger)", bg:"var(--danger-bg)"},
    {kind:"payment",         title:"Payment received",      body:"₹600 credited to your wallet", time:"2d ago", unread:false, ic:"card-outline", color:"var(--success)", bg:"var(--success-bg)"},
  ];
  return (
    <div className="scr">
      <window.StatusBar2/>
      <div style={{display:'flex',alignItems:'center',padding:'14px 16px'}}>
        <div style={{width:40,height:40,borderRadius:20,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:-8}}><i className="ion-ios-arrow-back" style={{fontSize:22}}></i></div>
        <span style={{flex:1,textAlign:'center',fontWeight:700,fontSize:18}}>Notifications</span>
        <span style={{width:90,textAlign:'right',fontWeight:700,fontSize:13}}>Mark all read</span>
      </div>
      <div className="scroll" style={{height:'calc(100% - 28px - 56px)'}}>
        {items.map((n,i)=>(
          <div key={i} style={{display:'flex',gap:12,padding:'14px 16px',background:n.unread?'var(--accent-tint)':'#fff',alignItems:'flex-start'}}>
            <div style={{width:40,height:40,borderRadius:12,background:n.bg,display:'flex',alignItems:'center',justifyContent:'center',marginTop:2}}>
              <i className={`ion-ios-${n.ic}`} style={{fontSize:20,color:n.color}}></i>
            </div>
            <div className="grow">
              <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{n.title}</div>
              <div className="meta" style={{color:'var(--text-2)',lineHeight:1.4,marginBottom:6}}>{n.body}</div>
              <div className="row gap-12">
                <span className="meta">{n.time}</span>
                <span style={{padding:'3px 10px',background:'var(--surface)',borderRadius:999,fontSize:10,fontWeight:700,color:n.color}}>Tap to open</span>
              </div>
            </div>
            {n.unread && <div style={{width:8,height:8,borderRadius:4,background:n.color,marginTop:8}}></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  ChatsListScreen, ChatScreen, ContactSupportScreen, SupportChatScreen, FAQScreen, NotificationsScreen,
  TonedAvatar,
});
