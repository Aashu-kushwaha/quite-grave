import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Feather, Clock, Shield, Sparkles, ArrowRight, CheckCircle2, BarChart2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TagPill } from '../components/TagPill';
import { VALID_REASON_TAGS } from '../data/mockData';
import { useGravequit } from '../context/GravequitContext';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useGravequit();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]">
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 md:px-8 overflow-hidden ambient-fog">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-xs text-[#A8C5B0]">
            <Sparkles className="w-3.5 h-3.5 text-[#A8C5B0]" />
            <span>Digital Sanctuary for Students</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold font-headline tracking-tight text-[#F5F5F0] leading-tight">
            Understand why you quit, <br />
            <span className="text-[#A8C5B0]">without the guilt.</span>
          </h1>

          <p className="text-base md:text-lg text-[#8A8A8A] max-w-2xl mx-auto font-body leading-relaxed">
            Gravequit is a quitting journal for students. It captures the real reasons you pause courses, habits, and projects in a 10-second flow right at the moment of stopping — turning stopping into self-discovery.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="primary" onClick={() => navigate('/items')}>
              <span>{user ? 'Go to My Items' : 'Start Your Journal'}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            {!user && (
              <Button size="lg" variant="secondary" onClick={() => navigate('/login')}>
                Log In
              </Button>
            )}
            <Button size="lg" variant="secondary" onClick={() => navigate('/about')}>
              Read Our Story
            </Button>
          </div>

          {/* Quick reassurance badge */}
          <div className="pt-6 flex items-center justify-center gap-6 text-xs text-[#8A8A8A]">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#A8C5B0]" />
              <span>No streaks or badges</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#A8C5B0]" />
              <span>10-second flow</span>
            </div>
          </div>

        </div>
      </section>

      {/* The 10-Second Flow Explainer Section */}
      <section className="py-16 px-4 md:px-8 border-t border-[#2A2A2A] bg-[#131313]">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold font-headline text-[#F5F5F0]">
              The 10-Second Reason-Capture Flow
            </h2>
            <p className="text-sm text-[#8A8A8A] max-w-xl mx-auto">
              Most tools ask you to reflect weeks later when the real reason has faded. Gravequit records honest signals at the moment of stopping.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <Card header="1. Log What You Start" headerAccent={true}>
              <p className="text-sm text-[#8A8A8A] leading-relaxed">
                Add a course, habit, skill, or side project with a title, category, and start date. No complicated setup.
              </p>
            </Card>

            <Card header="2. Tap 1 of 5 Valid Reasons" headerAccent={true}>
              <p className="text-sm text-[#8A8A8A] leading-relaxed mb-4">
                When you stop, mark it quit and select strictly one of 5 preset tags right at the moment of decision:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VALID_REASON_TAGS.map(tag => (
                  <TagPill key={tag} tag={tag} size="sm" />
                ))}
              </div>
            </Card>

            <Card header="3. Discover True Patterns" headerAccent={true}>
              <p className="text-sm text-[#8A8A8A] leading-relaxed">
                Over time, receive plain-language AI synthesis grounded strictly in your real numbers — revealing your true cadence.
              </p>
            </Card>

          </div>

        </div>
      </section>

      {/* Insight Without Pressure Section */}
      <section className="py-16 px-4 md:px-8 border-t border-[#2A2A2A] bg-[#0A0A0A]">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold font-headline text-[#F5F5F0]">
              Insight Without Pressure
            </h2>
            <p className="text-sm text-[#8A8A8A]">
              Built ground-up with a calm, observational tone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl space-y-3">
              <div className="w-8 h-8 rounded-full bg-[#354F3E] text-[#B0CEB8] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold font-headline text-[#F5F5F0]">Fact-Checked AI Grounding</h3>
              <p className="text-xs text-[#8A8A8A] leading-relaxed">
                Every AI insight statement is verified in code against real mathematical stats — preventing hallucinations or fake claims.
              </p>
            </div>

            <div className="p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl space-y-3">
              <div className="w-8 h-8 rounded-full bg-[#354F3E] text-[#B0CEB8] flex items-center justify-center">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold font-headline text-[#F5F5F0]">Momentum Score</h3>
              <p className="text-xs text-[#8A8A8A] leading-relaxed">
                Credits partial progress across all attempts. Formulated to celebrate expanding recovery windows instead of broken streaks.
              </p>
            </div>
          </div>

          <div className="text-center pt-8">
            {user ? (
              <Button size="lg" variant="primary" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            ) : (
              <Button size="lg" variant="primary" onClick={() => navigate('/login')}>
                Create Student Account
              </Button>
            )}
          </div>

          {/* Product Hunt Embed */}
          <div className="pt-24 pb-12 flex justify-center">
            
            <div className="bg-[#131313] border border-[#2A2A2A] rounded-2xl p-8 shadow-xl max-w-md w-full flex flex-col items-center">
              {/* Product Info Block */}
              <div className="flex items-center gap-4 mb-8 text-left w-full">
                <img 
                  alt="Gravequit" 
                  src="https://ph-files.imgix.net/aa3a9cda-aa26-413a-9fab-b9a5eb9a8a4a.jpeg?auto=compress,format&codec=mozjpeg&cs=strip&fit=crop&h=80&w=80" 
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0 shadow-lg border border-[#2A2A2A]"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold font-headline text-[#F5F5F0] truncate">Gravequit</h3>
                  <p className="text-sm text-[#8A8A8A] mt-1 leading-snug">Quiet Closure & Quitting Insights for Students</p>
                </div>
              </div>

              {/* PH Badge */}
              <div className="flex flex-col items-center gap-3 w-full border-t border-[#2A2A2A] pt-6">
                <span className="text-[10px] text-[#8A8A8A] font-mono uppercase tracking-widest">As Seen On</span>
                <a 
                  href="https://www.producthunt.com/products/gravequit?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-gravequit" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <img 
                    src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1233273&theme=dark&t=1787770233121" 
                    alt="Gravequit - Quiet Closure & Quitting Insights for Students | Product Hunt" 
                    width="250" 
                    height="54" 
                  />
                </a>
              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
};
