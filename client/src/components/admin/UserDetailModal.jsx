import { useEffect, useState } from "react";
import { Loader2, Mail, Phone, Calendar, Building2, Calculator, MessageSquare, Wallet, BadgeCheck, Star } from "lucide-react";
import Modal from "../Modal";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

export default function UserDetailModal({ userId, onClose }) {
  const { token } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .adminUserDetail(userId, token)
      .then(setDetail)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId, token]);

  return (
    <Modal title="User Details" onClose={onClose} maxWidth="max-w-xl">
      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {error && <p className="text-red-600">{error}</p>}

      {detail && !loading && (
        <div>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-lg font-semibold text-white">
              {detail.full_name?.[0]?.toUpperCase()}
            </span>
            <div>
              <p className="text-lg font-bold text-ink-900">{detail.full_name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold capitalize text-brand-600">
                  {detail.role}
                </span>
                {detail.is_suspended && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">Suspended</span>
                )}
                {detail.email_verified && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                    Email Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <p className="flex items-center gap-2 text-slate-600">
              <Mail className="h-4 w-4 text-slate-400" /> {detail.email}
            </p>
            {detail.phone && (
              <p className="flex items-center gap-2 text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" /> {detail.phone}
              </p>
            )}
            <p className="flex items-center gap-2 text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" /> Joined {new Date(detail.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Building2 className="h-4 w-4" />
                <span className="text-xs">Properties Listed</span>
              </div>
              <p className="mt-1 text-xl font-bold text-ink-900">{detail.propertyCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Calculator className="h-4 w-4" />
                <span className="text-xs">Estimates Submitted</span>
              </div>
              <p className="mt-1 text-xl font-bold text-ink-900">{detail.estimateCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs">Conversations</span>
              </div>
              <p className="mt-1 text-xl font-bold text-ink-900">{detail.conversationsCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Wallet className="h-4 w-4" />
                <span className="text-xs">Payments Made</span>
              </div>
              <p className="mt-1 text-xl font-bold text-ink-900">
                RWF {detail.paymentsTotal.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">{detail.paymentsCount} total</p>
            </div>
          </div>

          {detail.expertProfile && (
            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                Expert Profile
                {detail.expertProfile.is_verified && <BadgeCheck className="h-4 w-4 text-brand-500" />}
              </p>
              <p className="mt-1 text-sm text-slate-500">{detail.expertProfile.specialty}</p>
              <div className="mt-2 flex items-center gap-1 text-sm text-slate-600">
                <Star className="h-3.5 w-3.5 text-gold-400" fill="currentColor" />
                {detail.expertProfile.rating} ({detail.expertProfile.review_count} reviews)
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
