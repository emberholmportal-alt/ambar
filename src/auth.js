/* Age of Ansem · capa de acceso a la beta (Solana / Phantom).
   COSTURA: hoy funciona client-only. Cuando esté el backend en Render, sólo cambian
   `isHolder` (verificación server-side) y `registerUser` (unicidad + persistencia). */
const AOA_AUTH = (function(){
  /* ==== CONFIG — DEFINIR AL LANZAR EL TOKEN EN PUMP.FUN ==== */
  const TOKEN_MINT = null;                       // mint address del token SPL (pump.fun). null = token todavía no lanzado.
  const RPC_URL    = 'https://api.mainnet-beta.solana.com';
  const MIN_HOLD   = 1;                           // cantidad mínima de tokens para ser holder
  const PUMP_URL   = 'https://pump.fun';          // reemplazar por el link del token cuando exista
  const AUTH_MODE  = TOKEN_MINT ? 'live' : 'stub';   // 'stub' = sin token: deja pasar para poder probar todo el flujo

  function API(){ return (window.AOA_API || '').replace(/\/$/, ''); }   // backend en Render (vacío = client-only)

  function getProvider(){                            // cualquier wallet de Solana inyectada (Phantom, Solflare, Backpack, etc.)
    const p = window.solana || (window.phantom && window.phantom.solana) || window.solflare || window.backpack;
    return (p && (p.connect || p.isPhantom || p.isSolflare)) ? p : null;
  }
  function walletName(){ const p=getProvider(); if(!p) return null;
    return p.isPhantom?'Phantom' : p.isSolflare?'Solflare' : p.isBackpack?'Backpack' : 'Solana'; }
  function hasWallet(){ return !!getProvider(); }
  async function disconnect(){                        // cierra la sesión local y desconecta la wallet si soporta
    try{ const p=getProvider(); if(p && p.disconnect) await p.disconnect(); }catch(e){}
    clearSession();
  }

  async function connect(){
    const p = getProvider();
    if(!p) throw { code:'NO_WALLET', msg:'No encontramos Phantom en el navegador.' };
    const r = await p.connect();
    return r.publicKey.toString();
  }

  async function balanceOf(pubkey){                 // saldo SPL del token vía JSON-RPC (sin librerías)
    if(!TOKEN_MINT) return 0;
    const body = { jsonrpc:'2.0', id:1, method:'getParsedTokenAccountsByOwner',
      params:[ pubkey, { mint:TOKEN_MINT }, { encoding:'jsonParsed' } ] };
    const res = await fetch(RPC_URL, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) });
    const j = await res.json(); let total = 0;
    ((j.result && j.result.value) || []).forEach(a => {
      const t = a.account.data.parsed.info.tokenAmount; total += Number(t.uiAmount || 0);
    });
    return total;
  }

  async function isHolder(pubkey){                  // { holder, amount, stub }
    if(API()){                                      // backend: verificación server-side
      try{ const r = await fetch(API()+'/api/holder/'+encodeURIComponent(pubkey));
        if(r.ok) return await r.json();
      }catch(e){}                                    // si el backend falla, cae al chequeo local
    }
    if(AUTH_MODE === 'stub') return { holder:true, amount:null, stub:true };
    const amt = await balanceOf(pubkey);
    return { holder: amt >= MIN_HOLD, amount: amt, stub:false };
  }

  async function register(pubkey, username, proof){ // registra el usuario (backend si hay; si no, local)
    if(API()){
      const r = await fetch(API()+'/api/register', { method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ pubkey, username, proof }) });
      if(r.status === 409) throw { code:'NAME_TAKEN', msg:'Ese nombre ya está en uso.' };
      if(r.status === 400) throw { code:'NAME_BAD', msg:'Ese nombre no está permitido.' };
      if(r.status === 403) throw { code:'NOT_HOLDER', msg:'La billetera no holdea el token.' };
      if(!r.ok) throw { code:'ERR', msg:'No se pudo registrar.' };
      return await r.json();                          // { ok, username, session_token, stub }
    }
    return { ok:true, username, session_token:null, stub:(AUTH_MODE==='stub') };   // client-only
  }

  async function signProof(pubkey){                 // firma un nonce → sirve para atribuir el score en el backend (más adelante)
    try{
      const p = getProvider(); if(!p || !p.signMessage) return null;
      const nonce = 'Age of Ansem · ingreso beta · ' + pubkey.slice(0,6) + ' · ' + Math.floor(Date.now()/1000);
      const enc = new TextEncoder().encode(nonce);
      const out = await p.signMessage(enc, 'utf8');
      const bytes = out.signature || out;
      return { nonce, sig: btoa(String.fromCharCode.apply(null, bytes)) };
    }catch(e){ return null; }
  }

  function validName(n){ n = (n||'').trim(); return /^[\w .\-]{2,16}$/.test(n) ? n : null; }   // la unicidad la valida el backend

  function saveSession(sess){
    try{ localStorage.setItem('aoa_session', JSON.stringify(sess)); }catch(e){}
    // espeja el perfil que la beta ya usa para el ranking (usuario + billetera)
    try{ localStorage.setItem('aoa_profile', JSON.stringify({ user:sess.username||'', wallet:sess.pubkey||'' })); }catch(e){}
  }
  function getSession(){ try{ return JSON.parse(localStorage.getItem('aoa_session')||'null'); }catch(e){ return null; } }
  function clearSession(){ try{ localStorage.removeItem('aoa_session'); }catch(e){} }

  return { AUTH_MODE, TOKEN_MINT, MIN_HOLD, PUMP_URL, getProvider, walletName, hasWallet, connect, disconnect, isHolder, register, signProof, validName, saveSession, getSession, clearSession };
})();
window.AOA_AUTH = AOA_AUTH;
