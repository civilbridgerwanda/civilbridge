export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const { headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...headers },
    ...rest,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    // Attach the HTTP status and any structured error code (e.g.
    // "OUT_OF_CREDITS") so callers can branch on *why* a request failed
    // instead of pattern-matching the human-readable message.
    const err = new Error(json.message || "Request failed");
    err.status = res.status;
    err.code = json.code;
    throw err;
  }
  return json.data;
}

function toQueryString(params) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  return new URLSearchParams(clean).toString();
}

async function uploadFile(path, file, token) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Upload failed");
  }
  return json.data;
}

async function uploadFiles(path, files, token) {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Upload failed");
  }
  return json.data;
}

export const api = {
  getProperties: (params = {}, token) => {
    const qs = toQueryString(params);
    return request(`/properties${qs ? `?${qs}` : ""}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  },
  getProperty: (id, token) => request(`/properties/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  getMyProperties: (token) => request("/properties/mine", { headers: { Authorization: `Bearer ${token}` } }),
  createProperty: (payload, token) =>
    request("/properties", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    }),
  deleteProperty: (id, token) =>
    request(`/properties/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),
  getPropertyReviews: (id, token) =>
    request(`/properties/${id}/reviews`, { headers: { Authorization: `Bearer ${token}` } }),
  submitPropertyReview: (id, payload, token) =>
    request(`/properties/${id}/reviews`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  getExperts: (params = {}) => {
    const qs = toQueryString(params);
    return request(`/experts${qs ? `?${qs}` : ""}`);
  },
  getExpert: (id) => request(`/experts/${id}`),
  getMyExpertProfile: (token) => request("/experts/me", { headers: { Authorization: `Bearer ${token}` } }),
  createExpertProfile: (payload, token) =>
    request("/experts", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    }),
  getExpertReviews: (id) => request(`/experts/${id}/reviews`),
  submitExpertReview: (id, payload, token) =>
    request(`/experts/${id}/reviews`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  addPortfolioItem: (payload, token) =>
    request("/experts/portfolio", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  deletePortfolioItem: (id, token) =>
    request(`/experts/portfolio/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),
  getMyAssignedPlanInquiries: (token) =>
    request("/experts/me/plan-inquiries", { headers: { Authorization: `Bearer ${token}` } }),

  getPlans: (params = {}) => {
    const qs = toQueryString(params);
    return request(`/plans${qs ? `?${qs}` : ""}`);
  },
  getPlan: (id, token) => request(`/plans/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  submitPlanInquiry: (planId, payload, token) =>
    request(`/plans/${planId}/inquiries`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  getPlanReviews: (id, token) => request(`/plans/${id}/reviews`, { headers: { Authorization: `Bearer ${token}` } }),
  submitPlanReview: (id, payload, token) =>
    request(`/plans/${id}/reviews`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  createEstimate: (payload, token) =>
    request("/estimates", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  getEstimate: (id, token) => request(`/estimates/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  getMyEstimates: (token) => request("/estimates/mine", { headers: { Authorization: `Bearer ${token}` } }),
  getAssignedEstimates: (token) =>
    request("/estimates/assigned", { headers: { Authorization: `Bearer ${token}` } }),

  getAiConversations: (token) =>
    request("/ai-studio/conversations", { headers: { Authorization: `Bearer ${token}` } }),
  getAiConversation: (id, token) =>
    request(`/ai-studio/conversations/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  createAiConversation: (token) =>
    request("/ai-studio/conversations", { method: "POST", headers: { Authorization: `Bearer ${token}` } }),
  sendAiMessage: (conversationId, message, token) =>
    request(`/ai-studio/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message }),
    }),
  shareAiConversation: (conversationId, token) =>
    request(`/ai-studio/conversations/${conversationId}/share`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  getSharedAiConversation: (shareToken) => request(`/ai-studio/shared/${shareToken}`),

  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: (token) => request("/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
  verifyEmail: (email, code) =>
    request("/auth/verify-email", { method: "POST", body: JSON.stringify({ email, code }) }),
  resendOtp: (email) => request("/auth/resend-otp", { method: "POST", body: JSON.stringify({ email }) }),
  forgotPassword: (email) =>
    request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (email, code, new_password) =>
    request("/auth/reset-password", { method: "POST", body: JSON.stringify({ email, code, new_password }) }),
  requestUpgrade: (plan, token) =>
    request("/auth/request-upgrade", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan }),
    }),

  subscribeNewsletter: (email) =>
    request("/newsletter/subscribe", { method: "POST", body: JSON.stringify({ email }) }),

  submitContactForm: (payload) =>
    request("/contact", { method: "POST", body: JSON.stringify(payload) }),

  uploadImage: (file, token) => uploadFile("/uploads/image", file, token),
  uploadImages: (files, token) => uploadFiles("/uploads/images", files, token),

  adminStats: (token) => request("/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
  adminAnalytics: (token) => request("/admin/analytics", { headers: { Authorization: `Bearer ${token}` } }),
  adminEstimates: (token, params = {}) => {
    const qs = toQueryString(params);
    return request(`/admin/estimates${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  adminUsers: (token, params = {}) => {
    const qs = toQueryString(params);
    return request(`/admin/users${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  adminUserDetail: (id, token) => request(`/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  updateUserRole: (id, role, token) =>
    request(`/admin/users/${id}/role`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role }),
    }),
  updateUserPlan: (id, plan, token) =>
    request(`/admin/users/${id}/plan`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan }),
    }),
  setUserSuspended: (id, suspended, token) =>
    request(`/admin/users/${id}/suspend`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ suspended }),
    }),
  deleteUser: (id, token) =>
    request(`/admin/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),

  adminCreateProperty: (payload, token) =>
    request("/admin/properties", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  adminUpdateProperty: (id, payload, token) =>
    request(`/admin/properties/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  adminApproveProperty: (id, token) =>
    request(`/admin/properties/${id}/approve`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }),
  adminDeleteProperty: (id, token) =>
    request(`/admin/properties/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),

  adminCreatePlan: (payload, token) =>
    request("/admin/plans", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  adminUpdatePlan: (id, payload, token) =>
    request(`/admin/plans/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  adminDeletePlan: (id, token) =>
    request(`/admin/plans/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),

  adminNewsletter: (token) =>
    request("/admin/newsletter", { headers: { Authorization: `Bearer ${token}` } }),
  adminNewsletterCampaigns: (token) =>
    request("/admin/newsletter/campaigns", { headers: { Authorization: `Bearer ${token}` } }),
  sendNewsletterCampaign: (payload, token) =>
    request("/admin/newsletter/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  adminPlanInquiries: (token) =>
    request("/admin/plan-inquiries", { headers: { Authorization: `Bearer ${token}` } }),
  updatePlanInquiryStatus: (id, status, token) =>
    request(`/admin/plan-inquiries/${id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    }),
  assignPlanInquiry: (id, expertId, token) =>
    request(`/admin/plan-inquiries/${id}/assign`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ expert_id: expertId || null }),
    }),
  adminListConversations: (token) =>
    request("/admin/conversations", { headers: { Authorization: `Bearer ${token}` } }),
  adminGetConversation: (id, token) =>
    request(`/admin/conversations/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  updateEstimateStatus: (id, status, token) =>
    request(`/estimates/${id}/status`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({ status }),
    }),
  assignEstimateExpert: (id, expertId, token) =>
    request(`/estimates/${id}/assign`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ expert_id: expertId }),
    }),

  getNotifications: (token) => request("/notifications", { headers: { Authorization: `Bearer ${token}` } }),
  markNotificationRead: (id, token) =>
    request(`/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }),
  markAllNotificationsRead: (token) =>
    request("/notifications/read-all", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getConversations: (token) => request("/messages/conversations", { headers: { Authorization: `Bearer ${token}` } }),
  getSupportContact: (token) =>
    request("/messages/support-contact", { headers: { Authorization: `Bearer ${token}` } }),
  startConversation: (participantId, token) =>
    request("/messages/conversations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ participant_id: participantId }),
    }),
  getConversation: (id, token) =>
    request(`/messages/conversations/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  sendMessage: (conversationId, content, token) =>
    request(`/messages/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content }),
    }),

  createPayment: (payload, token) =>
    request("/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  getMyPayments: (token) => request("/payments/mine", { headers: { Authorization: `Bearer ${token}` } }),
  getReceivedPayments: (token) => request("/payments/received", { headers: { Authorization: `Bearer ${token}` } }),
  adminPayments: (token, params = {}) => {
    const qs = toQueryString(params);
    return request(`/admin/payments${qs ? `?${qs}` : ""}`, { headers: { Authorization: `Bearer ${token}` } });
  },
  updatePaymentStatus: (id, status, token) =>
    request(`/admin/payments/${id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    }),
};
