'use client'

import { type FormEvent, useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, CheckCircle2, FileImage, LoaderCircle, LogOut, ShieldCheck } from 'lucide-react'

type Course = { ID_CURSO: string; CURSO: string; DIVISION: string; TURNO: string; ACTIVO?: string }
type Student = { username: string; course: string; division: string; shift: string }
type Props = { courses: Course[]; student?: Student; loading?: boolean; error?: string; onEnter: (name: string, course: Course) => Promise<void>; onLogout: () => void }

export function StudentPortal({ courses, student, loading = false, error, onEnter, onLogout }: Props) {
  const [name, setName] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const course = courses.find((item) => item.ID_CURSO === selectedCourse)

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!course) return
    setFormError('')
    try { await onEnter(name, course) } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'No se pudo iniciar el recorrido.') }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setMessage('')
    if (!file) { setFormError('Seleccioná una imagen PNG o JPG para continuar.'); return }
    if (file.size > 3 * 1024 * 1024) { setFormError('La imagen no puede superar los 3 MB.'); return }
    setSubmitting(true)
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result.split(',')[1]) : reject(new Error('No se pudo leer la imagen.'))
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
        reader.readAsDataURL(file)
      })
      const response = await fetch('/api/observatory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subirMapa', payload: { fechaMapeo: date, titulo: title, descripcion: description, base64Data, fileName: file.name, mimeType: file.type } }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'No se pudo enviar el mapa.')
      setMessage('El mapa se envió correctamente. ¡Gracias por compartir la mirada de su curso!')
      setFile(null)
      setTitle('')
      setDescription('')
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo enviar el mapa.')
    } finally { setSubmitting(false) }
  }

  return <main className="min-h-screen bg-[#f6f7f3] px-4 py-8 text-slate-900 sm:py-12">
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-FSJVc7cMySTJm8LqhqvGTmua4KQhzg.png" alt="Escudo de la E.E.S.T. N.º 6 de Banfield" width={52} height={52} unoptimized className="size-[52px] object-contain" /><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#56816a]">E.E.S.T. N.º 6 · Banfield</p><p className="mt-1 text-sm font-semibold">Observatorio de Convivencia</p></div></div>
        {student && <button onClick={onLogout} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"><LogOut size={15} />Salir</button>}
      </header>

      {!student ? <section className="mx-auto max-w-xl rounded-2xl border border-[#e6e8e1] bg-white p-6 shadow-[0_18px_55px_rgba(30,58,47,.07)] sm:p-9">
        <div className="mb-7"><span className="inline-flex size-10 items-center justify-center rounded-xl bg-[#edf4ef] text-[#356b4f]"><ShieldCheck size={20} /></span><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#56816a]">Acceso estudiantes · sin contraseña</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Sumate al recorrido</h1><p className="mt-2 text-sm leading-6 text-slate-500">Ingresá tu nombre y curso para compartir el mapa de convivencia de tu grupo.</p></div>
        <form onSubmit={enter} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">Nombre y apellido<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required minLength={2} maxLength={80} className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#56816a] focus:ring-2 focus:ring-[#56816a]/15" placeholder="Cómo querés que te identifiquemos" /></label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">Curso, división y turno<select required value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)} disabled={loading || courses.length === 0} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#56816a] disabled:bg-slate-50"><option value="">{loading ? 'Cargando cursos…' : 'Elegí tu curso'}</option>{courses.filter((item) => String(item.ACTIVO ?? 'TRUE').toUpperCase() === 'TRUE').map((item) => <option key={item.ID_CURSO} value={item.ID_CURSO}>{item.CURSO}° {item.DIVISION} · {item.TURNO}</option>)}</select></label>
          {courses.length === 0 && !loading && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">No hay cursos activos cargados todavía. El equipo directivo debe habilitarlos en la planilla para que puedan ingresar.</p>}
          {(error || formError) && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-800">{formError || error}</p>}
          <button disabled={loading || !course} className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#174b38] px-4 text-sm font-semibold text-white transition hover:bg-[#103b2c] disabled:cursor-not-allowed disabled:opacity-55">Comenzar <ArrowRight size={16} /></button>
        </form>
        <p className="mt-5 border-t border-slate-100 pt-4 text-[11px] leading-5 text-slate-400">Solo solicitamos tu nombre y curso para identificar el envío. No necesitás crear una cuenta.</p>
      </section> : <>
        <section className="rounded-2xl bg-[#174b38] p-6 text-white sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">Recorrido de convivencia · Ciclo 2026</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Hola, {student.username}</h1><p className="mt-2 text-sm text-white/80">{student.course}° {student.division} · Turno {student.shift}</p><div className="mt-6 flex items-center gap-3 border-t border-white/15 pt-5"><span className="flex size-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">1</span><div><p className="text-sm font-semibold">Compartí el mapa de tu curso</p><p className="mt-0.5 text-xs text-white/70">Una imagen para construir una mirada colectiva de la escuela.</p></div></div></section>
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-5"><h2 className="text-base font-semibold">Enviar un mapa de convivencia</h2><p className="mt-1 text-xs leading-5 text-slate-500">Subí una imagen PNG o JPG de hasta 3 MB. El equipo directivo podrá revisarla.</p></div>
          {message && <p role="status" className="mb-4 flex items-start gap-2 rounded-lg bg-[#edf4ef] px-3 py-3 text-xs leading-5 text-[#174b38]"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{message}</p>}
          {(formError || error) && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-800">{formError || error}</p>}
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">Fecha del mapeo<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /></label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">Título del mapa<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="Ej. Espacios de encuentro" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /></label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">Descripción breve<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} placeholder="¿Qué representa el mapa?" className="resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:bg-slate-100"><input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><FileImage size={22} className="text-slate-400" /><span className="mt-2 text-xs font-semibold text-slate-700">{file?.name || 'Elegí una imagen PNG o JPG'}</span><span className="mt-1 text-[10px] text-slate-400">Tamaño máximo: 3 MB</span></label>
            {previewUrl && <div className="overflow-hidden rounded-lg border border-slate-200"><Image src={previewUrl} alt="Vista previa del mapa seleccionado" width={1200} height={800} unoptimized className="max-h-72 w-full object-contain" /></div>}
            <button disabled={submitting || !file} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#174b38] px-4 text-sm font-semibold text-white transition hover:bg-[#103b2c] disabled:cursor-not-allowed disabled:opacity-55">{submitting ? <LoaderCircle className="animate-spin" size={16} /> : <ArrowRight size={16} />}{submitting ? 'Enviando…' : 'Enviar mapa'}</button>
          </form>
        </section>
        <button onClick={onLogout} className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={14} />Cambiar nombre o curso</button>
      </>}
    </div>
  </main>
}
