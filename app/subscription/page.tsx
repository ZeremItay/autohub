'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Calendar, CheckCircle, X, Download, CreditCard, XCircle, Edit, Save, Settings, Users } from 'lucide-react';
import { getAllProfiles } from '@/lib/queries/profiles';
import { getAllRoles, type Role } from '@/lib/queries/roles';
import { supabase } from '@/lib/supabase';

export default function SubscriptionPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [roleEditData, setRoleEditData] = useState<{ [key: string]: { price: number; display_name: string; description?: string } }>({});
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);

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

      // Store session user for webhook
      setSessionUser(session.user);

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

  // Get subscription type display name from role
  function getSubscriptionType(): string {
    if (!currentUser) return 'חינמי';
    const role = currentUser.roles || currentUser.role;
    if (typeof role === 'object' && role?.display_name) {
      return role.display_name;
    }
    // Fallback based on role name
    const roleName = typeof role === 'object' ? role?.name : role;
    if (roleName === 'admin') return 'מנהל';
    if (roleName === 'premium') return 'מנוי פרימיום';
    if (roleName === 'free') return 'חינמי';
    return 'חינמי';
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

  // Get role price from current user's role (for subscription display)
  function getRolePriceFromUser(): number {
    if (!currentUser) return 0;
    const role = currentUser.roles || currentUser.role;
    if (typeof role === 'object' && role?.price !== undefined) {
      return role.price;
    }
    return 0;
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
  const subscriptionType = getSubscriptionType();
  const rolePrice = getRolePriceFromUser();
  const subscriptionData = userSubscription ? {
    status: userSubscription.status || 'active',
    type: userSubscription.roles?.display_name || subscriptionType,
    price: userSubscription.roles?.price || rolePrice,
    currency: 'ILS',
    billingCycle: 'monthly',
    nextRenewal: userSubscription.end_date || null,
    startDate: userSubscription.start_date || null,
    endDate: userSubscription.end_date || null,
    needsWarning: needsWarning(userSubscription.end_date),
    expired: isExpired(userSubscription.end_date),
    isPaidSubscription: true,
    features: [
      'גישה לכל הקורסים',
      'הקלטות ללא הגבלה',
      'תמיכה בעדיפות גבוהה',
      'גישה לפורום VIP',
      'הורדת חומרים'
    ]
  } : {
    // No subscription = free plan (based on role_id)
    status: roleName === 'free' ? 'active' : 'inactive',
    type: subscriptionType,
    price: rolePrice,
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
    setShowCancelModal(true);
  }

  async function confirmCancelSubscription() {
    setCancelling(true);
    
    try {
      // Reload user data if not available
      let user = currentUser;
      let session = sessionUser;

      // Get session if not already loaded
      if (!session) {
        const { data: { session: newSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !newSession) {
          alert('שגיאה: לא ניתן לזהות את המשתמש. אנא התחבר מחדש.');
          setCancelling(false);
          return;
        }
        session = newSession;
        setSessionUser(session);
      }

      // Reload user profile if not available
      if (!user) {
        const { data: profiles } = await getAllProfiles();
        if (profiles && Array.isArray(profiles) && profiles.length > 0) {
          user = profiles.find((p: any) => p.user_id === session!.user.id);
          if (user) {
            setCurrentUser(user);
          }
        }
      }

      if (!user) {
        alert('שגיאה: לא ניתן לזהות את המשתמש. אנא רענן את הדף ונסה שוב.');
        setCancelling(false);
        return;
      }

      // Get user data for webhook
      // Use profile.id (UUID) - Make.com should handle it
      // If Make.com needs numeric ID, we'll need to add a mapping table
      const userId = user.id;
      const email = session!.email || user.email || '';
      const name = user.display_name || user.first_name || user.nickname || 'משתמש';

      if (!userId || !email) {
        console.error('Missing user data:', { userId, email, user, session });
        alert('שגיאה: חסרים נתונים של המשתמש. אנא רענן את הדף ונסה שוב.');
        setCancelling(false);
        return;
      }

      // Send webhook to Make.com
      const webhookUrl = 'https://hook.eu1.make.com/wqcr84rueeewt4dazk67lc6ls6tt7jx6';
      const webhookData = [{
        user_id: userId,
        email: email,
        name: name,
        action: 'cancel_subscription'
      }];

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      if (response.ok) {
        alert('בקשת ביטול המנוי נשלחה בהצלחה. נציג יצור איתך קשר בקרוב.');
        setShowCancelModal(false);
      } else {
        throw new Error('Webhook failed');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('שגיאה בשליחת בקשת ביטול המנוי. אנא נסה שוב או צור קשר עם התמיכה.');
    } finally {
      setCancelling(false);
    }
  }

  function handleChangePlan() {
    // Redirect to payment page for subscription upgrade
    router.push('/payment');
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
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-right">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">המנוי שלי</h1>
          <p className="text-gray-600 text-sm sm:text-base">נהל את המנוי והתשלומים שלך</p>
        </div>

        {/* Warning Alert - Only show if end_date passed + 2 days */}
        {subscriptionData.needsWarning && !subscriptionData.expired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-yellow-600 text-xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 mb-1">המנוי שלך עומד לרדת</h3>
                <p className="text-sm text-yellow-700">
                  המנוי שלך פג ב-{subscriptionData.endDate ? formatDate(subscriptionData.endDate) : 'תאריך לא ידוע'}. 
                  לא התקבל תשלום. אם לא יתקבל תשלום תוך 3 ימים, המנוי ירד למנוי הקודם שלך.
                </p>
              </div>
            </div>
          </div>
        )}

        {subscriptionData.expired && subscriptionData.status === 'active' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-red-600 text-xl">⛔</div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 mb-1">המנוי שלך פג</h3>
                <p className="text-sm text-red-700">
                  המנוי שלך פג עקב חוסר תשלום. אנא צור קשר עם התמיכה או עדכן את אמצעי התשלום.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Card */}
        <div className={`rounded-2xl shadow-lg border p-6 sm:p-8 relative overflow-hidden ${
          subscriptionData.isPaidSubscription 
            ? 'bg-gradient-to-br from-pink-50 to-rose-50 border-pink-100' 
            : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
        }`}>
          {/* Status Badge */}
          {subscriptionData.status === 'active' && (
            <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold ${
              subscriptionData.isPaidSubscription 
                ? 'bg-[#F52F8E] text-white' 
                : 'bg-gray-400 text-white'
            }`}>
              {subscriptionData.isPaidSubscription ? 'פעיל' : 'מנוי חינמי'}
            </div>
          )}
          
          {/* Free Plan Notice */}
          {roleName === 'free' && !subscriptionData.isPaidSubscription && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 זהו מנוי חינמי. כדי לשדרג למנוי פרימיום, לחץ על "שדרוג מנוי" (כשיהיה זמין).
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Left Side - Subscription Info */}
            <div className="space-y-4 sm:space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-[#F52F8E]" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">{subscriptionData.type}</h2>
                </div>
                <p className="text-gray-600 text-sm sm:text-base">מנוי חודשי</p>
              </div>

              {/* Subscription Details */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3 text-sm sm:text-base">
                  <Calendar className="w-5 h-5 text-[#F52F8E] flex-shrink-0" />
                  <span className="text-gray-700">
                    <span className="font-semibold">מחיר:</span> ₪{subscriptionData.price} / חודש
                  </span>
                </div>
                {subscriptionData.endDate && (
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <Calendar className="w-5 h-5 text-[#F52F8E] flex-shrink-0" />
                    <span className="text-gray-700">
                      <span className="font-semibold">תאריך סיום:</span> {formatDate(subscriptionData.endDate)}
                    </span>
                  </div>
                )}
                {subscriptionData.startDate && (
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <Calendar className="w-5 h-5 text-[#F52F8E] flex-shrink-0" />
                    <span className="text-gray-700">
                      <span className="font-semibold">תאריך התחלה:</span> {formatDate(subscriptionData.startDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Features */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">כלול במנוי:</h3>
              <ul className="space-y-2 sm:space-y-3">
                {subscriptionData.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm sm:text-base">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            {isPremium ? (
              <>
                <button
                  onClick={handleCancelSubscription}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  בטל מנוי
                </button>
                <button
                  onClick={handleChangePlan}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base"
                >
                  שנה תוכנית
                </button>
                <button
                  onClick={handleUpdatePayment}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
                >
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  עדכן אמצעי תשלום
                </button>
              </>
            ) : (
              <button
                onClick={handleChangePlan}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors font-medium text-sm sm:text-base"
              >
                שדרג למנוי פרימיום
              </button>
            )}
          </div>
        </div>

        {/* Payment History - Only for premium users */}
        {isPremium && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
            <div className="text-right mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">היסטוריית תשלומים</h2>
              <p className="text-gray-600 text-sm sm:text-base">כל התשלומים והחשבוניות שלך</p>
            </div>

            {/* Payment List */}
            <div className="space-y-3 sm:space-y-4">
              {paymentHistory.length > 0 ? (
                paymentHistory.map((payment, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {/* Left Side - Date and Status */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      {payment.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm sm:text-base font-semibold text-gray-800">
                          {formatDate(payment.date)}
                        </p>
                        <p className={`text-xs sm:text-sm ${
                          payment.status === 'success' ? 'text-green-600' : 
                          payment.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {payment.status === 'success' ? 'הצליח' : 
                           payment.status === 'failed' ? 'נכשל' : 'ממתין'}
                        </p>
                      </div>
                    </div>
                    {payment.invoice_url && (
                      <button
                        onClick={() => handleDownloadInvoice(payment)}
                        className="p-2 text-gray-400 hover:text-[#F52F8E] transition-colors"
                        title="הורד חשבונית"
                      >
                        <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                </div>

                {/* Right Side - Amount and Payment Method */}
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-left sm:text-right">
                    <p className="text-lg sm:text-xl font-bold text-gray-800">₪{payment.amount}</p>
                    <p className="text-xs sm:text-sm text-gray-600">{payment.method}</p>
                  </div>
                </div>
              </div>
              ))
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">אין תשלומים עדיין</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Sections - Only visible to admins */}
        {isAdmin && (
          <>
            {/* Edit Roles Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-[#F52F8E]" />
                <div className="text-right">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">ניהול מנויים</h2>
                  <p className="text-gray-600 text-sm sm:text-base">ערוך את המנויים והמחירים שלהם</p>
                </div>
              </div>

              <div className="space-y-4">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">
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
                                className="px-3 py-1 border border-gray-300 rounded-lg text-lg font-semibold"
                              />
                            ) : (
                              role.display_name
                            )}
                          </h3>
                          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                            {role.name}
                          </span>
                        </div>
                        {editingRole === role.id ? (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">מחיר (₪):</label>
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">תיאור:</label>
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                rows={2}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-semibold">מחיר:</span> ₪{role.price || 0} / חודש
                            </p>
                            {role.description && (
                              <p className="text-sm text-gray-500">{role.description}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {editingRole === role.id ? (
                          <>
                            <button
                              onClick={() => handleSaveRole(role.id)}
                              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
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
                              className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                              title="בטל"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditingRole(role.id)}
                            className="p-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
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
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-[#F52F8E]" />
                <div className="text-right">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">כל המנויים</h2>
                  <p className="text-gray-600 text-sm sm:text-base">צפה בכל המשתמשים והמנויים שלהם</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">שם משתמש</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">אימייל</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">מנוי</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">מחיר</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">תאריך הצטרפות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((user) => {
                      const userRole = user.roles || user.role;
                      const roleName = typeof userRole === 'object' ? userRole?.name : userRole;
                      const roleDisplayName = typeof userRole === 'object' ? userRole?.display_name : '';
                      const rolePrice = typeof userRole === 'object' ? userRole?.price : 0;
                      
                      return (
                        <tr key={user.id || user.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-800">
                            {user.display_name || user.first_name || 'ללא שם'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {user.email || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              roleName === 'admin' ? 'bg-purple-100 text-purple-700' :
                              roleName === 'premium' ? 'bg-pink-100 text-pink-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {roleDisplayName || roleName || 'ללא מנוי'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-800">
                            ₪{rolePrice || 0} / חודש
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
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

        {/* Cancel Subscription Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">בטל מנוי</h3>
              
              <div className="mb-6 space-y-3">
                <p className="text-gray-700">
                  האם אתה בטוח שברצונך לבטל את המנוי?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-semibold mb-2">שימו לב:</p>
                  <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                    <li>הגישה להקלטות תרד</li>
                    <li>לא תהיה אפשרות להגיש פרויקטים</li>
                    <li>גישה מוגבלת לקורסים</li>
                    <li>אובדן גישה לתכונות פרימיום אחרות</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={confirmCancelSubscription}
                  disabled={cancelling}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      שולח...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      כן, בטל מנוי
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

