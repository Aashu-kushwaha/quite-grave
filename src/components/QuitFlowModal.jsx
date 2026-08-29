import React, { useState } from 'react';
import { X, Mic, MicOff, CheckCircle2, Feather } from 'lucide-react';
import { useGravequit } from '../context/GravequitContext';
import { VALID_REASON_TAGS } from '../data/mockData';
import { Button } from './Button';
import { TagPill } from './TagPill';

export const QuitFlowModal = () => {
  const { isQuitModalOpen, activeQuitItem, closeQuitModal, submitQuitEvent } = useGravequit();

  const [selectedTag, setSelectedTag] = useState('No Deadline');
  const [reasonText, setReasonText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPrePrompt, setShowPrePrompt] = useState(false);
  const [hasSeenPrePrompt, setHasSeenPrePrompt] = useState(false);
  const recognitionRef = React.useRef(null);

  if (!isQuitModalOpen || !activeQuitItem) return null;

  const startActualRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recording.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setVoiceTranscript('');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleRecording = () => {
    if (!isRecording) {
      if (!hasSeenPrePrompt) {
        setShowPrePrompt(true);
        return;
      }
      startActualRecording();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    }
  };

  const handleAllowMic = () => {
    setHasSeenPrePrompt(true);
    setShowPrePrompt(false);
    startActualRecording();
  };

  const handleDenyMic = () => {
    setShowPrePrompt(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitQuitEvent({
      itemId: activeQuitItem.id,
      reason_tag: selectedTag,
      reason_text: reasonText || voiceTranscript || 'Ended commitment intentionally.',
      voice_transcript: voiceTranscript || null,
      ended_at: endDate
    });

    setReasonText('');
    setVoiceTranscript('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[16px] max-w-lg w-full p-6 shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#354F3E] flex items-center justify-center text-[#B0CEB8]">
              <Feather className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-headline text-[#F5F5F0]">10-Second Quiet Closure</h2>
              <p className="text-xs text-[#8A8A8A]">Capture why right now before memory fades.</p>
            </div>
          </div>
          <button 
            onClick={closeQuitModal}
            className="p-1 rounded-full text-[#8A8A8A] hover:text-[#F5F5F0] hover:bg-[#222222]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Item Display */}
        <div className="my-4 p-3.5 bg-[#20201F] border border-[#2A2A2A] rounded-xl">
          <span className="text-[10px] text-[#8A8A8A] uppercase tracking-widest font-semibold block mb-0.5">
            Ending Commitment
          </span>
          <h3 className="text-base font-semibold text-[#F5F5F0] font-headline">
            {activeQuitItem.title}
          </h3>
          <span className="text-xs text-[#A8C5B0] inline-block mt-1">
            Category: {activeQuitItem.category}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* End Date */}
          <div>
            <label className="block text-xs font-medium text-[#8A8A8A] mb-1.5 uppercase tracking-wider">
              End Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] focus:border-[#A8C5B0] text-[#F5F5F0] text-sm rounded-lg px-3.5 py-2.5 outline-none transition-colors"
              />
            </div>
          </div>

          {/* 5 Preset Tag Selector */}
          <div>
            <label className="block text-xs font-medium text-[#8A8A8A] mb-2 uppercase tracking-wider">
              Primary Reason (Tap One of 5 Valid Tags)
            </label>
            <div className="flex flex-wrap gap-2">
              {VALID_REASON_TAGS.map((tag) => (
                <TagPill
                  key={tag}
                  tag={tag}
                  selectable={true}
                  selected={selectedTag === tag}
                  onClick={(t) => setSelectedTag(t)}
                  size="md"
                />
              ))}
            </div>
          </div>

          {/* Optional Text Note / Mic */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-[#8A8A8A] uppercase tracking-wider">
                Optional Reflection / Voice Note
              </label>
              <button
                type="button"
                onClick={toggleRecording}
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                  isRecording 
                    ? 'bg-[#354F3E] text-[#B0CEB8] border-[#A8C5B0] animate-pulse'
                    : 'bg-[#1A1A1A] text-[#8A8A8A] border-[#2A2A2A] hover:text-[#F5F5F0]'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isRecording ? 'Listening...' : 'Record Voice Note'}</span>
              </button>
            </div>

            {voiceTranscript ? (
              <div className="p-3 bg-[#131313] border border-[#A8C5B0]/40 rounded-lg text-xs text-[#B0CEB8] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#A8C5B0] mt-0.5" />
                <div>
                  <span className="font-semibold block">Transcribed Voice Note:</span>
                  <p className="italic">{voiceTranscript}</p>
                </div>
              </div>
            ) : (
              <textarea
                rows={2}
                placeholder="What was the catalyst at this exact moment?"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                className="w-full bg-[#131313] border border-[#2A2A2A] focus:border-[#A8C5B0] text-[#F5F5F0] placeholder-[#8A8A8A]/50 text-xs rounded-lg p-3 outline-none transition-colors resize-none"
              />
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-between border-t border-[#2A2A2A]">
            <span className="text-[11px] text-[#8A8A8A]">
              Observed with peace & clarity
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={closeQuitModal}>
                Keep Active
              </Button>
              <Button variant="primary" type="submit">
                Save & Let Go
              </Button>
            </div>
          </div>
        </form>

        {/* Pre-Prompt Overlay */}
        {showPrePrompt && (
          <div className="absolute inset-0 z-10 bg-[#1A1A1A]/95 backdrop-blur-sm rounded-[16px] flex flex-col items-center justify-center p-8 animate-fade-in text-center border border-[#2A2A2A]">
            <div className="w-12 h-12 rounded-full bg-[#354F3E] flex items-center justify-center text-[#B0CEB8] mb-4 shadow-lg border border-[#A8C5B0]/30">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-headline text-[#F5F5F0] mb-2">Enable Voice Notes</h3>
            <p className="text-sm text-[#8A8A8A] mb-8 leading-relaxed">
              Gravequit can instantly transcribe your raw thoughts into your journal. To do this, we need temporary access to your microphone when you record.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-[240px]">
              <Button variant="primary" onClick={handleAllowMic} className="w-full justify-center">
                Grant Access
              </Button>
              <Button variant="secondary" onClick={handleDenyMic} className="w-full justify-center text-[#8A8A8A]">
                Maybe Later
              </Button>
            </div>
            <p className="text-[10px] text-[#8A8A8A]/50 mt-6 mt-auto">
              Your browser will ask for final permission next.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
