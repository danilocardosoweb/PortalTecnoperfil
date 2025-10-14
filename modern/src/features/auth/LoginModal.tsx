import React, { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'

export function LoginModal({open,onClose,onSuccess}:{open:boolean;onClose:()=>void;onSuccess:(user:{id:string;username:string})=>void}){
  const [username,setUsername]=useState('')
  const [password,setPassword]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')

  useEffect(()=>{ if(!open){ setUsername(''); setPassword(''); setError(''); setLoading(false) } },[open])

  async function handleLogin(e:React.FormEvent){
    e.preventDefault()
    setError('')
    setLoading(true)
    try{
      const snap = await getDocs(query(collection(db,'admin_users'), where('username','==', username.trim())))
      if(snap.empty){ setError('Usuário não encontrado.'); setLoading(false); return }
      const doc = snap.docs[0]
      const data = doc.data() as any
      if(String(data.password||'') !== password){ setError('Senha incorreta.'); setLoading(false); return }
      onSuccess({id: doc.id, username: data.username})
    }catch(err:any){
      console.error(err)
      setError('Falha ao validar. Tente novamente.')
    } finally { setLoading(false) }
  }

  return (
    <Modal open={open} title="Entrar" onClose={onClose}>
      <form className="space-y-3" onSubmit={handleLogin}>
        <div>
          <label className="block text-sm font-medium mb-1">Usuário</label>
          <input className="w-full px-3 py-2 border rounded" value={username} onChange={e=>setUsername(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Senha</label>
          <input type="password" className="w-full px-3 py-2 border rounded" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2 border rounded" onClick={onClose}>Cancelar</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading? 'Entrando...':'Entrar'}</button>
        </div>
      </form>
      <div className="text-xs text-gray-500 mt-3">Acesso restrito apenas para configuração.</div>
    </Modal>
  )
}
