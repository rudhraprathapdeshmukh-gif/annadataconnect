import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImpactScoreCard } from './ImpactScoreCard';
import { Heart, TrendingUp, Clock, Utensils, CalendarDays, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MonthlyData {
  month: string;
  donations: number;
}

interface FoodTypeData {
  name: string;
  value: number;
}

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(0, 84%, 60%)',
];

export function ImpactDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDonated: 0,
    totalReceived: 0,
    completedDonations: 0,
    completedReceived: 0,
    peopleHelped: 0,
    reliabilityScore: 100,
    avgRating: 0,
    ratingCount: 0,
    totalQuantity: 0,
    streak: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [foodTypeData, setFoodTypeData] = useState<FoodTypeData[]>([]);
  const [userType, setUserType] = useState<string>('both');
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    if (user) fetchImpactData();
  }, [user]);

  const fetchImpactData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, user_type, reliability_score')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setUserType(profile.user_type || 'both');
        setUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User');
        setStats(prev => ({ ...prev, reliabilityScore: profile.reliability_score ?? 100 }));
      }

      // Fetch donor stats
      const { data: myDonations } = await supabase
        .from('food_donations')
        .select('id, food_type, quantity, quantity_unit, created_at, status')
        .eq('donor_id', user.id)
        .is('deleted_at', null);

      const allDonations = myDonations || [];
      const completedDonationIds: string[] = [];

      // Get completed donations via requests
      if (allDonations.length > 0) {
        const { data: completedRequests } = await supabase
          .from('food_requests')
          .select('donation_id, receiver_rating')
          .in('donation_id', allDonations.map(d => d.id))
          .eq('status', 'completed');

        const completed = completedRequests || [];
        completed.forEach(r => {
          if (!completedDonationIds.includes(r.donation_id)) {
            completedDonationIds.push(r.donation_id);
          }
        });

        // Avg rating from receivers
        const ratings = completed.filter(r => r.receiver_rating).map(r => r.receiver_rating!);
        if (ratings.length > 0) {
          const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          setStats(prev => ({ ...prev, avgRating: Math.round(avg * 10) / 10, ratingCount: ratings.length }));
        }
      }

      // Fetch receiver stats
      const { data: myRequests } = await supabase
        .from('food_requests')
        .select('id, donation_id, status')
        .eq('requester_id', user.id);

      const completedReceived = (myRequests || []).filter(r => r.status === 'completed').length;

      // Calculate people helped based on quantity and unit
      const completedDonationDetails = allDonations.filter(d => completedDonationIds.includes(d.id));
      const calcPeopleHelped = completedDonationDetails.reduce((sum, d) => {
        const num = parseFloat(d.quantity);
        if (isNaN(num) || num <= 0) return sum;
        const unit = (d.quantity_unit || 'kg').toLowerCase();
        if (unit === 'kg' || unit === 'litre' || unit === 'litres' || unit === 'l') {
          return sum + Math.ceil(num * 2);
        }
        if (unit === 'g' || unit === 'grams' || unit === 'gram' || unit === 'ml') {
          return sum + (num <= 100 ? 1 : Math.ceil(num / 500));
        }
        // pieces, servings, plates, boxes, etc.
        return sum + Math.ceil(num);
      }, 0);

      // Monthly data (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const monthlyMap: Record<string, number> = {};
      for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        monthlyMap[key] = 0;
      }

      completedDonationDetails.forEach(d => {
        const date = new Date(d.created_at);
        if (date >= sixMonthsAgo) {
          const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          if (monthlyMap[key] !== undefined) {
            monthlyMap[key]++;
          }
        }
      });

      setMonthlyData(Object.entries(monthlyMap).map(([month, donations]) => ({ month, donations })));

      // Food type breakdown
      const typeMap: Record<string, number> = {};
      completedDonationDetails.forEach(d => {
        const type = d.food_type || 'Other';
        typeMap[type] = (typeMap[type] || 0) + 1;
      });
      setFoodTypeData(
        Object.entries(typeMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

      // Donation streak (consecutive months with at least 1 donation)
      let streak = 0;
      const monthKeys = Object.keys(monthlyMap).reverse();
      for (const key of monthKeys) {
        if (monthlyMap[key] > 0) streak++;
        else break;
      }

      setStats(prev => ({
        ...prev,
        totalDonated: allDonations.length,
        completedDonations: completedDonationIds.length,
        completedReceived,
        totalReceived: (myRequests || []).length,
        peopleHelped: calcPeopleHelped,
        streak,
      }));
    } catch (error) {
      if (import.meta.env.DEV) console.error('Impact data error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="py-8">
              <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const isDonor = userType === 'donor' || userType === 'both';
  const isReceiver = userType === 'receiver' || userType === 'both';

  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isDonor && (
          <>
            <StatCard
              icon={<Heart className="h-5 w-5 text-red-500" />}
              label="Meals Donated"
              value={stats.completedDonations}
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-green-500" />}
              label="People Helped"
              value={stats.peopleHelped}
            />
          </>
        )}
        {isReceiver && (
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-green-500" />}
            label="Meals Received"
            value={stats.completedReceived}
          />
        )}
        <StatCard
          icon={<CalendarDays className="h-5 w-5 text-blue-500" />}
          label="Active Streak"
          value={stats.streak}
          suffix={stats.streak === 1 ? 'month' : 'months'}
        />
        {isDonor && stats.avgRating > 0 && (
          <StatCard
            icon={<Award className="h-5 w-5 text-yellow-500" />}
            label={`Avg Rating (${stats.ratingCount})`}
            value={`${stats.avgRating.toFixed(1)} / 5`}
          />
        )}
      </div>

      {/* Impact Score Card */}
      {isDonor && (
        <ImpactScoreCard
          completedDonations={stats.completedDonations}
          reliabilityScore={stats.reliabilityScore}
          peopleHelped={stats.peopleHelped}
          userName={userName}
        />
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Donations Chart */}
        {isDonor && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Monthly Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.some(d => d.donations > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                        color: 'hsl(var(--card-foreground))',
                      }}
                    />
                    <Bar dataKey="donations" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  No donation data yet. Start donating to see your progress!
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Food Type Breakdown */}
        {isDonor && foodTypeData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Utensils className="h-4 w-4 text-primary" />
                Food Type Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={foodTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    label={false}
                  >
                    {foodTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                      color: 'hsl(var(--card-foreground))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {foodTypeData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground truncate max-w-[120px]">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Receiver Impact */}
      {isReceiver && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              Your Food Journey
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-3xl font-bold text-primary">{stats.totalReceived}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Requests</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.completedReceived}</p>
                <p className="text-xs text-muted-foreground mt-1">Meals Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: string | number; suffix?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-4 px-2 text-center gap-1.5">
        {icon}
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
          {suffix ? `${label} (${suffix})` : label}
        </p>
      </CardContent>
    </Card>
  );
}
