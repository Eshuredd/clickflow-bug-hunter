
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap, Users, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const SubscriptionTiers = () => {
  const { user, userSubscription } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const currentTier = userSubscription?.subscription_tier || 'Free';

  const handleUpgrade = (planName: string) => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to upgrade your plan.",
      });
      navigate('/auth');
      return;
    }
    
    toast({
      title: "Upgrade Feature",
      description: `Upgrade to ${planName} will be available soon. Contact support for early access.`,
    });
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out our bug detection platform',
      features: [
        '5 analyses per month',
        '10 elements per page scan',
        'Basic PDF reporting',
        'Community support',
        'Standard bug detection'
      ],
      icon: CheckCircle,
      color: 'text-green-400',
      buttonText: currentTier === 'Free' ? 'Current Plan' : 'Downgrade',
      buttonVariant: 'outline' as const,
      isCurrent: currentTier === 'Free',
      requiresAuth: false
    },
    {
      name: 'Professional',
      price: '$49',
      period: 'per month',
      description: 'Advanced features for development teams',
      features: [
        'Unlimited analyses',
        'AI verification with Gemini',
        'Team collaboration (5 members)',
        'Priority support',
        'GitHub, Jira, Slack integrations',
        'Advanced reporting & analytics',
        'Custom bug categories'
      ],
      icon: Zap,
      color: 'text-blue-400',
      buttonText: currentTier === 'Professional' ? 'Current Plan' : user ? 'Upgrade Now' : 'Sign In to Upgrade',
      buttonVariant: currentTier === 'Professional' ? 'outline' as 'outline' : 'default' as 'default',
      popular: true,
      isCurrent: currentTier === 'Professional',
      requiresAuth: true
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: 'per month',
      description: 'Complete solution for large organizations',
      features: [
        'Everything in Professional',
        'Unlimited team members',
        'Custom AI training',
        'SSO & advanced security',
        'Dedicated support manager',
        'SLA guarantees',
        'White-label options',
        'API access',
        'Custom integrations'
      ],
      icon: Crown,
      color: 'text-purple-400',
      buttonText: currentTier === 'Enterprise' ? 'Current Plan' : user ? 'Contact Sales' : 'Sign In to Contact Sales',
      buttonVariant: 'outline' as const,
      isCurrent: currentTier === 'Enterprise',
      requiresAuth: true
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Choose Your Plan</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Scale your bug detection capabilities with plans designed for individuals, 
          teams, and enterprises. {user ? `You're currently on the ${currentTier} plan.` : 'Sign in to track your subscription.'}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <Card key={index} className={`bg-slate-800/50 border-slate-700 relative ${
            plan.popular && !plan.isCurrent ? 'ring-2 ring-blue-500/50' : ''
          } ${plan.isCurrent ? 'ring-2 ring-green-500/50' : ''}`}>
            {plan.popular && !plan.isCurrent && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white">
                Most Popular
              </Badge>
            )}
            {plan.isCurrent && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white">
                Current Plan
              </Badge>
            )}
            
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <plan.icon className={`h-8 w-8 ${plan.color}`} />
              </div>
              <CardTitle className="text-white text-xl">{plan.name}</CardTitle>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-slate-400 text-sm">/{plan.period}</span>
              </div>
              <CardDescription className="text-slate-400">
                {plan.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className={`w-full ${
                  plan.buttonVariant === 'default' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                }`}
                variant={plan.buttonVariant}
                disabled={plan.isCurrent}
                onClick={() => !plan.isCurrent && handleUpgrade(plan.name)}
              >
                {plan.buttonText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enterprise Contact */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Need a Custom Solution?</h3>
          <p className="text-slate-400 mb-6">
            We offer custom enterprise solutions with volume pricing, on-premise deployment, 
            and specialized compliance certifications.
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" className="border-slate-600 text-slate-300">
              Schedule Demo
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => !user && navigate('/auth')}
            >
              {user ? 'Contact Enterprise Sales' : 'Sign In to Contact Sales'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
