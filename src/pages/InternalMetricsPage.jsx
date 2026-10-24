
import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

import { Card } from '../components/Card';
import { TagPill } from '../components/TagPill';
import { Button } from '../components/Button';
import { useGravequit } from '../context/GravequitContext';

export const InternalMetricsPage = () => {
  const { apiBase, getAuthHeaders } = useGravequit();

  const [internalMetrics, setInternalMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState(null);

  // Fetch internal metrics
  const fetchMetrics = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/metrics/internal`, {
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        throw new Error(`Failed to load metrics (${res.status})`);
      }

      const data = await res.json();
      setInternalMetrics(data);
    } catch (error) {
      console.error('Error fetching internal metrics:', error);
      setInternalMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [apiBase, getAuthHeaders]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Retrain AI model
  const handleRetrain = async () => {
    if (retraining) return;

    setRetraining(true);
    setRetrainMsg(null);

    try {
      const res = await fetch(`${apiBase}/admin/retrain`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.detail || `Retraining failed (${res.status})`
        );
      }

      setRetrainMsg({
        type: 'success',
        text: data.message || 'Model successfully retrained.'
      });

      await fetchMetrics();
    } catch (error) {
      console.error('Error retraining model:', error);

      setRetrainMsg({
        type: 'error',
        text: error.message || 'Could not connect to the retraining endpoint.'
      });
    } finally {
      setRetraining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-[#8A8A8A]">
        Loading metrics...
      </div>
    );
  }

  if (!internalMetrics) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4 text-[#8A8A8A]">
        <p>Could not load metrics. Check your backend and login status.</p>
        <Button variant="primary" size="sm" onClick={fetchMetrics}>
          Retry
        </Button>
      </div>
    );
  }

  const dauTrend = internalMetrics.dauTrend || [];
  const recentActivity = internalMetrics.recentActivity || [];

  let peakText = '';

  if (dauTrend.length > 0) {
    const maxDau = Math.max(...dauTrend.map(day => day.dau));
    const peakDays = dauTrend
      .filter(day => day.dau === maxDau)
      .map(day => day.day);

    peakText = `Peak activity on ${peakDays.join(' and ')}.`;

    const tagCounts = {};

    recentActivity.forEach(activity => {
      if (activity.tag && activity.tag !== 'Other') {
        tagCounts[activity.tag] =
          (tagCounts[activity.tag] || 0) + 1;
      }
    });

    const topTag = Object.entries(tagCounts).sort(
      (a, b) => b[1] - a[1]
    )[0];

    if (topTag) {
      peakText += ` Driven primarily by ${topTag[0]}.`;
    }
  }

  const formatNumber = value =>
    Number(value ?? 0).toLocaleString();

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 md:px-8 py-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="pb-4 border-b border-[#2A2A2A] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#A8C5B0] font-mono uppercase tracking-widest mb-1">
              <Cpu className="w-4 h-4 text-[#A8C5B0]" />
              <span>
                Internal Hackathon & Product Verification Dashboard
              </span>
            </div>

            <h1 className="text-3xl font-extrabold font-headline text-[#F5F5F0]">
              Team / Judge Metrics
            </h1>

            <p className="text-sm text-[#8A8A8A] mt-1">
              Internal numbers proving real user engagement, RAG
              accuracy, and multi-agent pipeline performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleRetrain}
              disabled={retraining}
            >
              {retraining ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Retraining Model...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  <span>Retrain AI Model</span>
                </>
              )}
            </Button>

            <div className="px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full text-xs text-[#8A8A8A] font-mono">
              Status: Live System Online
            </div>
          </div>
        </div>

        {/* Retraining notification */}
        {retrainMsg && (
          <div
            role="status"
            className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
              retrainMsg.type === 'success'
                ? 'bg-[#161E19] text-[#B0CEB8] border-[#A8C5B0]/40'
                : 'bg-[#1C1B1B] text-[#FFB4AB] border-[#93000A]/40'
            }`}
          >
            {retrainMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}

            <span>{retrainMsg.text}</span>
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card header="Total Registered Users">
            <div className="space-y-1">
              <span className="text-3xl font-extrabold font-headline text-[#F5F5F0]">
                {formatNumber(internalMetrics.totalUsers)}
              </span>
              <span className="text-xs text-[#8A8A8A] block">
                Verified Student Accounts
              </span>
            </div>
          </Card>

          <Card header="Total Items Logged">
            <div className="space-y-1">
              <span className="text-3xl font-extrabold font-headline text-[#F5F5F0]">
                {formatNumber(internalMetrics.totalItemsLogged)}
              </span>
              <span className="text-xs text-[#8A8A8A] block">
                Courses, Skills, Habits
              </span>
            </div>
          </Card>

          <Card header="Quit Events Recorded">
            <div className="space-y-1">
              <span className="text-3xl font-extrabold font-headline text-[#F5F5F0]">
                {formatNumber(internalMetrics.totalQuitEvents)}
              </span>
              <span className="text-xs text-[#8A8A8A] block">
                10-Second Flow Completed
              </span>
            </div>
          </Card>

          <Card header="AI Synthesis Accuracy">
            <div className="space-y-1">
              <span className="text-3xl font-extrabold font-headline text-[#A8C5B0]">
                {formatNumber(internalMetrics.aiAccuracyRate)}%
              </span>
              <span className="text-xs text-[#8A8A8A] block">
                Fact-Check Grounding Score
              </span>
            </div>
          </Card>
        </div>

        {/* AI accuracy and feedback */}
        <Card
          header="AI Grounding & User Thumbs Feedback (LangGraph Pipeline)"
          headerAccent={true}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-2 text-center p-4 bg-[#131313] border border-[#2A2A2A] rounded-xl">
              <span className="text-xs text-[#8A8A8A] uppercase tracking-wider block">
                Fact-Check Accuracy
              </span>
              <span className="text-4xl font-extrabold font-headline text-[#A8C5B0]">
                {formatNumber(internalMetrics.aiAccuracyRate)}%
              </span>
              <p className="text-[11px] text-[#8A8A8A]">
                Zero invented mathematical claims
              </p>
            </div>

            <div className="space-y-2 text-center p-4 bg-[#131313] border border-[#2A2A2A] rounded-xl">
              <div className="flex items-center justify-center gap-2 text-[#A8C5B0]">
                <ThumbsUp className="w-5 h-5" />
                <span className="text-2xl font-bold font-headline">
                  {formatNumber(internalMetrics.thumbsUpCount)}
                </span>
              </div>
              <span className="text-xs text-[#8A8A8A] block">
                Positive Thumbs-Up Reactions
              </span>
            </div>

            <div className="space-y-2 text-center p-4 bg-[#131313] border border-[#2A2A2A] rounded-xl">
              <div className="flex items-center justify-center gap-2 text-[#8A8A8A]">
                <ThumbsDown className="w-5 h-5" />
                <span className="text-2xl font-bold font-headline">
                  {formatNumber(internalMetrics.thumbsDownCount)}
                </span>
              </div>
              <span className="text-xs text-[#8A8A8A] block">
                Needs Refinement Ratings
              </span>
            </div>
          </div>
        </Card>

        {/* DAU trend and activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <Card header="Daily Active Users Trend (DAU)">
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-2 h-44 pt-4 px-2 border-b border-[#2A2A2A]">
                {dauTrend.map((day, _, arr) => {
                  const maxDau = Math.max(
                    ...arr.map(item => item.dau),
                    5
                  );

                  const heightPct = Math.max(
                    15,
                    (day.dau / maxDau) * 85
                  );

                  return (
                    <div
                      key={day.day}
                      className="flex-1 h-full flex flex-col justify-end items-center gap-2 group relative"
                    >
                      <div className="absolute -top-8 bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F0] text-[10px] font-mono px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {day.dau} Users
                      </div>

                      <div
                        className="w-full max-w-[36px] bg-[#354F3E] hover:bg-[#A8C5B0] rounded-t-lg transition-all"
                        style={{ height: `${heightPct}%` }}
                      />

                      <span className="text-[10px] text-[#8A8A8A] font-mono shrink-0">
                        {day.day}
                      </span>
                    </div>
                  );
                })}
              </div>

              {peakText && (
                <p className="text-xs text-[#8A8A8A] text-center mt-4">
                  {peakText}
                </p>
              )}
            </div>
          </Card>

          <Card header="Live Activity Stream">
            <div className="space-y-3">
              {recentActivity.map(activity => (
                <div
                  key={activity.id}
                  className="p-3 bg-[#131313] border border-[#2A2A2A] rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#F5F5F0]">
                        {activity.action}
                      </span>

                      <TagPill
                        tag={activity.tag}
                        selected={true}
                        size="sm"
                      />
                    </div>

                    <p className="text-[#8A8A8A] text-[11px]">
                      {activity.details}
                    </p>
                  </div>

                  <span className="text-[10px] text-[#8A8A8A] font-mono">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};
