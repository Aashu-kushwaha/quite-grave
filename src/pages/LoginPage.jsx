import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Feather, ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useGravequit } from '../context/GravequitContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, signup, sendVerificationCode, loginWithGoogle, isAuthenticated, user, logout, apiBase } = useGravequit();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
  const googleBtnRef = useRef(null);

  // Fetch Google Client ID from backend config if not provided in Vite env
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${apiBase}/auth/config`);
        if (res.ok) {
          const data = await res.json();
          if (data.google_client_id) {
            setGoogleClientId(data.google_client_id);
          }
        }
      } catch (err) {
        console.warn('Could not fetch auth config:', err);
      }
    };
    fetchConfig();
  }, [apiBase]);

  // Handle Google Identity Services credential response
  const handleGoogleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      setErrorMsg('Google sign-in did not return valid credentials.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    const result = await loginWithGoogle(response.credential);
    setSubmitting(false);

    if (result.success) {
      navigate('/items');
    } else {
      setErrorMsg(result.error || 'Google authentication failed.');
    }
  };

  // Initialize and render Google Identity Services button
  useEffect(() => {
    if (!googleClientId) return;

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
          });

          if (googleBtnRef.current) {
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'filled_black',
              size: 'large',
              width: '100%',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
            });
          }
        } catch (e) {
          console.error('Google Sign-In initialization error:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [googleClientId]);

  const handleCustomGoogleClick = () => {
    if (!googleClientId) {
      setErrorMsg('GOOGLE_CLIENT_ID is not configured yet. Please add it to your backend/.env file.');
      return;
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // If prompt fails/dismissed, fall back to triggering prompt again
        }
      });
    }
  };

  const [step, setStep] = useState(1); // 1 = details, 2 = code
  const [code, setCode] = useState('');
  
  const validatePassword = (pass) => {
    return {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[@!#*&%^$]/.test(pass)
    };
  };

  const passValidation = validatePassword(password);
  const isPasswordValid = Object.values(passValidation).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    if (isSignUp && step === 1) {
      if (!isPasswordValid) {
        setErrorMsg('Please meet all password requirements.');
        setSubmitting(false);
        return;
      }
      const result = await sendVerificationCode(email, password);
      setSubmitting(false);
      if (result.success) {
        setStep(2);
      } else {
        setErrorMsg(result.error || 'Failed to send verification code.');
      }
      return;
    }

    let result;
    if (isSignUp && step === 2) {
      result = await signup(email, password, code);
    } else {
      result = await login(email, password);
    }

    setSubmitting(false);

    if (result.success) {
      navigate('/items');
    } else {
      setErrorMsg(result.error || 'Authentication failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-[#0A0A0A]">
      <div className="max-w-md w-full space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] mx-auto flex items-center justify-center">
            <Feather className="w-6 h-6 text-[#A8C5B0]" />
          </div>
          <h1 className="text-2xl font-bold font-headline text-[#F5F5F0]">
            {isSignUp ? (step === 1 ? 'Create Your Sanctuary' : 'Verify Your Email') : 'Welcome Back to Gravequit'}
          </h1>
          <p className="text-xs text-[#8A8A8A]">
            {isSignUp 
              ? (step === 1 ? 'Begin observing your journeys with clarity and zero guilt.' : `We sent a 6-digit code to ${email}`) 
              : 'Sign in to access your items, pattern summaries, and insights.'}
          </p>
        </div>

        {/* Auth Card */}
        <Card className="p-8">
          
          {isAuthenticated && (
            <div className="mb-6 p-3 bg-[#161E19] border border-[#A8C5B0]/30 rounded-xl text-xs text-[#B0CEB8] flex items-center justify-between">
              <span>Logged in as <strong>{user?.email}</strong></span>
              <button 
                onClick={() => { logout(); }}
                className="underline hover:text-[#F5F5F0]"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Auth Tab Switcher */}
          {step === 1 && (
            <div className="flex p-1 bg-[#131313] rounded-lg border border-[#2A2A2A] mb-6">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                  !isSignUp ? 'bg-[#1A1A1A] text-[#F5F5F0] border border-[#2A2A2A]' : 'text-[#8A8A8A]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                  isSignUp ? 'bg-[#1A1A1A] text-[#F5F5F0] border border-[#2A2A2A]' : 'text-[#8A8A8A]'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 bg-[#1C1B1B] border border-[#93000A]/60 rounded-xl text-xs text-[#FFB4AB] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          {step === 1 && (
            <div className="mb-5 space-y-2">
              <div 
                ref={googleBtnRef} 
                className="w-full min-h-[44px] flex items-center justify-center overflow-hidden rounded-lg"
              >
                {/* Fallback button if Google GSI iframe is loading or if clicked directly */}
                <button
                  type="button"
                  onClick={handleCustomGoogleClick}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-[#161616] hover:bg-[#202020] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-lg text-sm font-medium text-[#F5F5F0] transition-colors shadow-sm disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <div className="h-[1px] bg-[#2A2A2A] flex-1"></div>
                <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider font-semibold">Or with email</span>
                <div className="h-[1px] bg-[#2A2A2A] flex-1"></div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {step === 1 && (
              <>
                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-[#8A8A8A] mb-1.5 uppercase tracking-wider">
                    Student Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8A8A8A] absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="student@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#131313] border border-[#2A2A2A] focus:border-[#A8C5B0] text-[#F5F5F0] placeholder-[#8A8A8A]/40 text-sm rounded-lg pl-10 pr-3.5 py-2.5 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-[#8A8A8A] mb-1.5 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8A8A8A] absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#131313] border border-[#2A2A2A] focus:border-[#A8C5B0] text-[#F5F5F0] placeholder-[#8A8A8A]/40 text-sm rounded-lg pl-10 pr-3.5 py-2.5 outline-none transition-colors"
                    />
                  </div>
                  
                  {isSignUp && password.length > 0 && (
                    <div className="mt-3 p-3 bg-[#131313] rounded-lg border border-[#2A2A2A] space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold mb-2">Password Requirements</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${passValidation.length ? 'bg-[#A8C5B0]' : 'bg-[#4A4A4A]'}`} />
                        <span className={`text-xs ${passValidation.length ? 'text-[#B0CEB8]' : 'text-[#8A8A8A]'}`}>At least 8 characters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${passValidation.uppercase ? 'bg-[#A8C5B0]' : 'bg-[#4A4A4A]'}`} />
                        <span className={`text-xs ${passValidation.uppercase ? 'text-[#B0CEB8]' : 'text-[#8A8A8A]'}`}>One uppercase letter</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${passValidation.lowercase ? 'bg-[#A8C5B0]' : 'bg-[#4A4A4A]'}`} />
                        <span className={`text-xs ${passValidation.lowercase ? 'text-[#B0CEB8]' : 'text-[#8A8A8A]'}`}>One lowercase letter</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${passValidation.number ? 'bg-[#A8C5B0]' : 'bg-[#4A4A4A]'}`} />
                        <span className={`text-xs ${passValidation.number ? 'text-[#B0CEB8]' : 'text-[#8A8A8A]'}`}>One number</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${passValidation.special ? 'bg-[#A8C5B0]' : 'bg-[#4A4A4A]'}`} />
                        <span className={`text-xs ${passValidation.special ? 'text-[#B0CEB8]' : 'text-[#8A8A8A]'}`}>One special character (@!#*&%^$)</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 2 && (
              <div>
                <label className="block text-xs font-medium text-[#8A8A8A] mb-1.5 uppercase tracking-wider text-center">
                  6-Digit Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full text-center tracking-[0.5em] font-mono text-xl bg-[#131313] border border-[#2A2A2A] focus:border-[#A8C5B0] text-[#F5F5F0] placeholder-[#8A8A8A]/40 rounded-lg py-3 outline-none transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full text-center mt-4 text-xs text-[#8A8A8A] hover:text-[#F5F5F0] underline"
                >
                  Go back
                </button>
              </div>
            )}

            {/* Submit */}
            <Button variant="primary" type="submit" className="w-full mt-2" disabled={submitting || (isSignUp && step === 1 && !isPasswordValid)}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>{step === 1 ? (isSignUp ? 'Sending Code...' : 'Authenticating...') : 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <span>{step === 1 ? (isSignUp ? 'Send Verification Code' : 'Sign In with Email') : 'Verify & Create Account'}</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Privacy Note */}
        <div className="p-3.5 bg-[#131313] border border-[#2A2A2A] rounded-xl text-center flex items-center justify-center gap-2 text-xs text-[#8A8A8A]">
          <ShieldCheck className="w-4 h-4 text-[#A8C5B0] shrink-0" />
          <span>We never sell your data or share individual entries with university offices.</span>
        </div>

      </div>
    </div>
  );
};
