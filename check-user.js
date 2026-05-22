const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nigxmbvxrlsiskrnqfzq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZ3htYnZ4cmxzaXNrcm5xZnpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg5NzM1MywiZXhwIjoyMDk0NDczMzUzfQ.F3VHK3Yofwhm62cJKmPsnfGAi2vZSZoM_no-FeHt9WM'
);

async function check() {
  try {
    // Get user ID
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === 'tharonetworld@gmail.com');
    console.log('User ID:', user?.id);

    if (!user) {
      console.log('User not found!');
      return;
    }

    // Check subscription
    const { data: subs, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id);

    console.log('Subscription error:', subError);
    console.log('Subscriptions:', JSON.stringify(subs, null, 2));

    // Check profile
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id);

    console.log('Profile error:', profError);
    console.log('Profile:', JSON.stringify(profile, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
