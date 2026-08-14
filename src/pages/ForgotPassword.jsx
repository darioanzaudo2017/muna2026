import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const { resetPasswordForEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [isEmailFocused, setIsEmailFocused] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    const { error: resetError } = await resetPasswordForEmail(email)
    setIsSubmitting(false)
    if (resetError) {
      setError('No pudimos enviar el email. Intentá nuevamente.')
      return
    }
    setSent(true)
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col selection:bg-primary-fixed">
      <main className="flex-grow flex items-center justify-center px-margin-mobile py-xl">
        <div className="w-full max-w-[420px]">
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden border border-outline-variant/30">
            <div className="p-8 md:p-10">
              <div className="flex flex-col items-center mb-8">
                <span className="material-symbols-outlined text-[48px] text-primary mb-4">lock_reset</span>
                <h1 className="font-headline-lg text-headline-lg text-primary text-center">Recuperar contraseña</h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-2 text-center">
                  Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>

              {sent ? (
                <div className="text-center space-y-6">
                  <p className="font-body-md text-body-md text-on-surface">
                    Si el email <span className="font-semibold">{email}</span> está registrado, vas a recibir un enlace para restablecer tu contraseña en los próximos minutos.
                  </p>
                  <a
                    className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors cursor-pointer"
                    onClick={() => navigate('/login')}
                  >
                    Volver a Iniciar Sesión
                  </a>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="email">Correo Electrónico</label>
                    <div className="relative">
                      <span className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline transition-colors ${
                        isEmailFocused ? 'text-primary' : ''
                      }`}>
                        mail
                      </span>
                      <input
                        className="w-full h-12 pl-12 pr-4 bg-surface-container rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md"
                        id="email"
                        name="email"
                        placeholder="nombre@municipio.gob"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setIsEmailFocused(true)}
                        onBlur={() => setIsEmailFocused(false)}
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-error text-sm text-center -mt-2">{error}</p>
                  )}

                  <button
                    className="w-full h-[48px] bg-primary hover:bg-primary-container text-on-primary font-headline-md text-headline-md rounded-lg shadow-sm active:opacity-80 transition-all flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">sync</span>
                        Enviando...
                      </>
                    ) : (
                      'Enviar enlace de recuperación'
                    )}
                  </button>

                  <div className="text-center">
                    <a
                      className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors cursor-pointer"
                      onClick={() => navigate('/login')}
                    >
                      Volver a Iniciar Sesión
                    </a>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
