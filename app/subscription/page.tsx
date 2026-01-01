'use client';

import { useState, useEffect } from 'react';
import { Crown, Calendar, CheckCircle, X, Download, CreditCard, XCircle, Edit, Save, Settings, Users } from 'lucide-react';
import { getAllProfiles } from '@/lib/queries/profiles';
import { getAllRoles, type Role } from '@/lib/queries/roles';
import { supabase } from '@/lib/supabase';

export default function SubscriptionPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [roleEditData, setRoleEditData] = useState<{ [key: string]: { price: number; display_name: string; description?: string } }>({});
  const [userSubscription, setUserSubscription] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    setLoading(true);
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setLoading(false);
        return;
      }

      const { data: profiles } = await getAllProfiles();
      if (profiles && Array.isArray(profiles) && profiles.length > 0) {
        // Find user by session user_id
        const user = profiles.find((p: any) => p.user_id === session.user.id) || profiles[0];
        setCurrentUser(user);

        // Load user payments
        await loadUserPayments(session.user.id);

        // Load user subscription
        await loadUserSubscription(session.user.id);

        // Check if user is admin
        const role = user.roles || user.role;
        const roleName = typeof role === 'object' ? role?.name : role;
        if (roleName === 'admin') {
          setIsAdmin(true);
          await loadAdminData();
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserPayments(userId: string) {
    try {
      const response = await fetch('/api/user/payments');
      if (response.ok) {
        const { data } = await response.json();
        // Transform payments to match the expected format
        const transformedPayments = (data || []).map((payment: any) => ({
          date: payment.payment_date || payment.created_at,
          status: payment.status === 'completed' ? 'success' : payment.status === 'failed' ? 'failed' : 'pending',
          amount: payment.amount,
          method: payment.payment_method || 'לא צוין',
          invoice_url: payment.invoice_url,
          invoice_number: payment.invoice_number,
          transaction_id: payment.transaction_id
        }));
        setPaymentHistory(transformedPayments);
      }
    } catch (error) {
      console.error('Error loading user payments:', error);
    }
  }

  async function loadUserSubscription(userId: string) {
    try {
      const response = await fetch('/api/user/subscription');
      if (response.ok) {
        const { data } = await response.json();
        setUserSubscription(data);
      }
    } catch (error) {
      console.error('Error loading user subscription:', error);
    }
  }

  async function loadAdminData() {
    try {
      // Load all roles
      const { data: rolesData } = await getAllRoles();
      if (rolesData) {
        setRoles(rolesData);
        // Initialize edit data
        const editData: { [key: string]: { price: number; display_name: string; description?: string } } = {};
        rolesData.forEach((role: Role) => {
          editData[role.id] = {
            price: role.price || 0,
            display_name: role.display_name,
            description: role.description || ''
          };
        });
        setRoleEditData(editData);
      }

      // Load all users with their roles
      const { data: profiles } = await getAllProfiles();
      if (profiles) {
        setAllUsers(profiles as any[]);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  }

  async function handleSaveRole(roleId: string) {
    try {
      const editData = roleEditData[roleId];
      if (!editData) return;

      const response = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: roleId,
          price: editData.price,
          display_name: editData.display_name,
          description: editData.description
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`שגיאה בעדכון המנוי: ${error.error || 'שגיאה לא ידועה'}`);
        return;
      }

      // Reload roles
      await loadAdminData();
      setEditingRole(null);
      alert('המנוי עודכן בהצלחה!');
    } catch (error) {
      console.error('Error saving role:', error);
      alert('שגיאה בעדכון המנוי');
    }
  }

  function isPremiumUser(): boolean {
    if (!currentUser) return false;
    const role = currentUser.roles || currentUser.role;
    const roleName = typeof role === 'object' ? role?.name : role;
    return roleName === 'premium' || roleName === 'admin';
  }

  // Get user role name
  function getUserRoleName(): string {
    if (!currentUser) return 'free';
    const role = currentUser.roles || currentUser.role;
    if (typeof role === 'object') {
      return role?.name || 'free';
    }
    return role || 'free';
  }

  const roleName = getUserRoleName();
  const isPremium = isPremiumUser();

  // Get role price from current user's role
  function getRolePrice(): number {
    if (!currentUser) return 0;
    const role = currentUser.roles || currentUser.role;
    if (typeof role === 'object' && role?.price !== undefined) {
      return role.price;
    }
    // Fallback to default prices
    return isPremium ? 97 : 0;
  }

  // Check if subscription needs warning (end_date passed + 2 days, no payment)
  function needsWarning(endDate: string | null | undefined): boolean {
    if (!endDate) return false;
    const end = new Date(endDate);
    const today = new Date();
    const daysSinceExpiry = Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
    // Need warning if end_date passed at least 2 days ago
    return daysSinceExpiry >= 2;
  }

  // Check if subscription has expired
  function isExpired(endDate: string | null | undefined): boolean {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  }

  // Subscription data based on user subscription or role
  // If user has subscription (paid) → show subscription details
  // If no subscription → show free plan (based on role_id)
  const subscriptionPrice = userSubscription?.roles?.price || 0;
  const subscriptionData = userSubscription ? {
    status: userSubscription.status || 'active',
    type: subscriptionPrice > 0 
      ? (userSubscription.roles?.display_name || 'Pro')
      : (userSubscription.roles?.display_name || 'חינמי'),
    price: subscriptionPrice,
    currency: 'ILS',
    billingCycle: 'monthly',
    nextRenewal: userSubscription.end_date || null,
    startDate: userSubscription.start_date || null,
    endDate: userSubscription.end_date || null,
    needsWarning: needsWarning(userSubscription.end_date),
    expired: isExpired(userSubscription.end_date),
    isPaidSubscription: subscriptionPrice > 0, // Only paid if price > 0
    features: subscriptionPrice > 0 ? [
      'גישה לכל הקורסים',
      'הקלטות ללא הגבלה',
      'תמיכה בעדיפות גבוהה',
      'גישה לפורום VIP',
      'הורדת חומרים'
    ] : [
      'גישה בסיסית לקהילה',
      'צפייה בפורומים',
      'גישה לקורסים בסיסיים'
    ]
  } : {
    // No subscription = free plan (based on role_id)
    status: roleName === 'free' ? 'active' : 'inactive',
    type: roleName === 'free' ? 'חינמי' : (isPremium ? 'Pro' : 'Free'),
    price: 0,
    currency: 'ILS',
    billingCycle: 'monthly',
    nextRenewal: null,
    startDate: currentUser?.created_at || null,
    endDate: null,
    needsWarning: false,
    expired: false,
    isPaidSubscription: false,
    features: roleName === 'free' ? [
      'גישה בסיסית לקהילה',
      'צפייה בפורומים',
      'גישה לקורסים בסיסיים'
    ] : (isPremium ? [
      'גישה לכל הקורסים',
      'הקלטות ללא הגבלה',
      'תמיכה בעדיפות גבוהה',
      'גישה לפורום VIP',
      'הורדת חומרים'
    ] : [
      'גישה בסיסית לקהילה',
      'צפייה בפורומים',
      'גישה לקורסים בסיסיים'
    ])
  };

  // Payment history - will be loaded from database
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function handleCancelSubscription() {
    if (confirm('האם אתה בטוח שברצונך לבטל את המנוי?')) {
      // TODO: Implement cancel subscription
      alert('ביטול המנוי יטופל בקרוב');
    }
  }

  function handleChangePlan() {
    // TODO: Implement change plan
    alert('שינוי תוכנית יטופל בקרוב');
  }

  function handleUpdatePayment() {
    // TODO: Implement update payment method
    alert('עדכון אמצעי תשלום יטופל בקרוב');
  }

  function handleDownloadInvoice(payment: any) {
    if (payment.invoice_url) {
      window.open(payment.invoice_url, '_blank');
    } else {
      alert(`אין קישור לחשבונית עבור תשלום זה`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F52F8E] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-right">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">המנוי שלי</h1>
          <p className="text-gray-300 text-sm sm:text-base">נהל את המנוי והתשלומים שלך</p>
        </div>

        {/* Warning Alert - Only show if end_date passed + 2 days */}
        {subscriptionData.needsWarning && !subscriptionData.expired && (
          <div className="glass-card rounded-3xl border-yellow-500/30 bg-yellow-500/10 p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-yellow-400 text-xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-300 mb-1">המנוי שלך עומד לרדת</h3>
                <p className="text-sm text-yellow-200">
                  המנוי שלך פג ב-{subscriptionData.endDate ? formatDate(subscriptionData.endDate) : 'תאריך לא ידוע'}. 
                  לא התקבל תשלום. אם לא יתקבל תשלום תוך 3 ימים, המנוי ירד למנוי הקודם שלך.
                </p>
              </div>
            </div>
          </div>
        )}

        {subscriptionData.expired && subscriptionData.status === 'active' && (
          <div className="glass-card rounded-3xl border-red-500/30 bg-red-500/10 p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-red-400 text-xl">⛔</div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-300 mb-1">המנוי שלך פג</h3>
                <p className="text-sm text-red-200">
                  המנוי שלך פג עקב חוסר תשלום. אנא צור קשר עם התמיכה או עדכן את אמצעי התשלום.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Card */}
        <div className={`glass-card rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden ${
          subscriptionData.isPaidSubscription 
            ? 'border-hot-pink/40' 
            : 'border-white/20'
        }`}>
          {/* Status Badge */}
          {subscriptionData.status === 'active' && (
            <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold ${
              subscriptionData.isPaidSubscription 
                ? 'bg-hot-pink text-white' 
                : 'bg-gray-500 text-white'
            }`}>
              {subscriptionData.isPaidSubscription ? 'פעיל' : 'מנוי חינמי'}
            </div>
          )}
          
          {/* Free Plan Notice */}
          {!subscriptionData.isPaidSubscription && (
            <div className="mb-4 p-3 glass-card rounded-xl border-hot-pink/30 bg-hot-pink/10">
              <p className="text-sm text-hot-pink-light">
                💡 זהו מנוי חינמי. כדי לשדרג למנוי פרימיום, לחץ על "שדרוג מנוי" (כשיהיה זמין).
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Left Side - Subscription Info */}
            <div className="space-y-4 sm:space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-hot-pink" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">מנוי {subscriptionData.type}</h2>
                </div>
                <p className="text-gray-300 text-sm sm:text-base">מנוי חודשי</p>
              </div>

              {/* Subscription Details */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3 text-sm sm:text-base">
                  <Calendar className="w-5 h-5 text-hot-pink flex-shrink-0" />
                  <span className="text-white">
                    <span className="font-semibold">מחיר:</span> ₪{subscriptionData.price} / חודש
                  </span>
                </div>
                {subscriptionData.endDate && (
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <Calendar className="w-5 h-5 text-hot-pink flex-shrink-0" />
                    <span className="text-white">
                      <span className="font-semibold">תאריך סיום:</span> {formatDate(subscriptionData.endDate)}
                    </span>
                  </div>
                )}
                {subscriptionData.startDate && (
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <Calendar className="w-5 h-5 text-hot-pink flex-shrink-0" />
                    <span className="text-white">
                      <span className="font-semibold">תאריך התחלה:</span> {formatDate(subscriptionData.startDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Features */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4">כלול במנוי:</h3>
              <ul className="space-y-2 sm:space-y-3">
                {subscriptionData.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm sm:text-base">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-200">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            {subscriptionData.isPaidSubscription ? (
              <>
                <button
                  onClick={handleCancelSubscription}
                  className="btn-danger px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  בטל מנוי
                </button>
                <button
                  onClick={handleChangePlan}
                  className="btn-secondary px-4 sm:px-6 py-2.5 sm:py-3 font-medium text-sm sm:text-base"
                >
                  שנה תוכנית
                </button>
                <button
                  onClick={handleUpdatePayment}
                  className="btn-secondary px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
                >
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  עדכן אמצעי תשלום
                </button>
              </>
            ) : (
              <button
                onClick={handleChangePlan}
                className="btn-primary px-4 sm:px-6 py-2.5 sm:py-3 font-medium text-sm sm:text-base"
              >
                שדרג למנוי פרימיום
              </button>
            )}
          </div>
        </div>

        {/* Payment History - Only for premium users */}
        {isPremium && (
          <div className="glass-card rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="text-right mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">היסטוריית תשלומים</h2>
              <p className="text-gray-300 text-sm sm:text-base">כל התשלומים והחשבוניות שלך</p>
            </div>

            {/* Payment List */}
            <div className="space-y-3 sm:space-y-4">
              {paymentHistory.length > 0 ? (
                paymentHistory.map((payment, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 bg-white/5 rounded-xl hover:bg-white/10 transition-colors glass-card"
                >
                  {/* Left Side - Date and Status */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      {payment.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm sm:text-base font-semibold text-white">
                          {formatDate(payment.date)}
                        </p>
                        <p className={`text-xs sm:text-sm ${
                          payment.status === 'success' ? 'text-green-400' : 
                          payment.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {payment.status === 'success' ? 'הצליח' : 
                           payment.status === 'failed' ? 'נכשל' : 'ממתין'}
                        </p>
                      </div>
                    </div>
                    {payment.invoice_url && (
                      <button
                        onClick={() => handleDownloadInvoice(payment)}
                        className="p-2 text-gray-400 hover:text-hot-pink transition-colors"
                        title="הורד חשבונית"
                      >
                        <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                </div>

                {/* Right Side - Amount and Payment Method */}
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-left sm:text-right">
                    <p className="text-lg sm:text-xl font-bold text-white">₪{payment.amount}</p>
                    <p className="text-xs sm:text-sm text-gray-400">{payment.method}</p>
                  </div>
                </div>
              </div>
              ))
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">אין תשלומים עדיין</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Sections - Only visible to admins */}
        {isAdmin && (
          <>
            {/* Edit Roles Section */}
            <div className="glass-card rounded-3xl shadow-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-hot-pink" />
                <div className="text-right">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">ניהול מנויים</h2>
                  <p className="text-gray-300 text-sm sm:text-base">ערוך את המנויים והמחירים שלהם</p>
                </div>
              </div>

              <div className="space-y-4">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="p-4 bg-white/5 rounded-xl border border-white/20 glass-card"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {editingRole === role.id ? (
                              <input
                                type="text"
                                value={roleEditData[role.id]?.display_name || ''}
                                onChange={(e) => {
                                  setRoleEditData({
                                    ...roleEditData,
                                    [role.id]: {
                                      ...roleEditData[role.id],
                                      display_name: e.target.value
                                    }
                                  });
                                }}
                                className="px-3 py-1 border border-white/20 rounded-lg text-lg font-semibold bg-white/5 text-white"
                              />
                            ) : (
                              role.display_name
                            )}
                          </h3>
                          <span className="text-xs px-2 py-1 bg-white/10 text-gray-300 rounded">
                            {role.name}
                          </span>
                        </div>
                        {editingRole === role.id ? (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-sm text-gray-300 mb-1">מחיר (₪):</label>
                              <input
                                type="number"
                                value={roleEditData[role.id]?.price || 0}
                                onChange={(e) => {
                                  setRoleEditData({
                                    ...roleEditData,
                                    [role.id]: {
                                      ...roleEditData[role.id],
                                      price: parseFloat(e.target.value) || 0
                                    }
                                  });
                                }}
                                className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-300 mb-1">תיאור:</label>
                              <textarea
                                value={roleEditData[role.id]?.description || ''}
                                onChange={(e) => {
                                  setRoleEditData({
                                    ...roleEditData,
                                    [role.id]: {
                                      ...roleEditData[role.id],
                                      description: e.target.value
                                    }
                                  });
                                }}
                                className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400"
                                rows={2}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-300">
                              <span className="font-semibold">מחיר:</span> ₪{role.price || 0} / חודש
                            </p>
                            {role.description && (
                              <p className="text-sm text-gray-400">{role.description}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {editingRole === role.id ? (
                          <>
                            <button
                              onClick={() => handleSaveRole(role.id)}
                              className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                              title="שמור"
                            >
                              <Save className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingRole(null);
                                // Reset edit data
                                loadAdminData();
                              }}
                              className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                              title="בטל"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditingRole(role.id)}
                            className="p-2 bg-hot-pink text-white rounded-full hover:bg-rose-500 transition-colors"
                            title="ערוך"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Users Subscriptions Section */}
            <div className="glass-card rounded-3xl shadow-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-hot-pink" />
                <div className="text-right">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">כל המנויים</h2>
                  <p className="text-gray-300 text-sm sm:text-base">צפה בכל המשתמשים והמנויים שלהם</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-right py-3 px-4 text-sm font-semibold text-white">שם משתמש</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-white">אימייל</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-white">מנוי</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-white">מחיר</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-white">תאריך הצטרפות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((user) => {
                      const userRole = user.roles || user.role;
                      const roleName = typeof userRole === 'object' ? userRole?.name : userRole;
                      const roleDisplayName = typeof userRole === 'object' ? userRole?.display_name : '';
                      const rolePrice = typeof userRole === 'object' ? userRole?.price : 0;
                      
                      return (
                        <tr key={user.id || user.user_id} className="border-b border-white/20 hover:bg-white/5">
                          <td className="py-3 px-4 text-sm text-white">
                            {user.display_name || user.first_name || 'ללא שם'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {user.email || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              roleName === 'admin' ? 'bg-purple-100 text-purple-700' :
                              roleName === 'premium' ? 'bg-pink-100 text-pink-700' :
                              'bg-white/10 text-white'
                            }`}>
                              {roleDisplayName || roleName || 'ללא מנוי'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-800">
                            ₪{rolePrice || 0} / חודש
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {user.created_at ? formatDate(user.created_at) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

