import { Button } from "@/pages/ui/button";
import { Card, CardContent } from "@/pages/ui/card";
import { Badge } from "@/pages/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  BarChart3, 
  Users, 
  TrendingUp, 
  Zap, 
  Shield,
  CheckCircle,
  ArrowRight,
  Star
} from "lucide-react";

export default function Index() {
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageSquare,
      title: "Real-Time Surveys",
      description: "Create and deploy employee surveys instantly with smart question templates and automated scheduling"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Track engagement metrics, identify trends, and get actionable insights from your team's feedback"
    },
    {
      icon: Users,
      title: "Employee Management",
      description: "Centralize employee data, roles, and performance tracking in one intuitive dashboard"
    },
    {
      icon: TrendingUp,
      title: "Performance Insights",
      description: "Identify top performers and employees needing support with AI-powered analysis"
    },
    {
      icon: Zap,
      title: "Instant Feedback",
      description: "Enable continuous feedback loops with our intelligent chatbot and submission system"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Enterprise-grade security with role-based access control and data encryption"
    }
  ];

  const useCases = [
    {
      title: "HR Teams",
      description: "Streamline employee engagement and gather meaningful insights",
      metric: "85% faster survey deployment"
    },
    {
      title: "Team Leaders",
      description: "Monitor team health and address concerns proactively",
      metric: "3x more actionable feedback"
    },
    {
      title: "Executives",
      description: "Get real-time visibility into company-wide engagement",
      metric: "40% improvement in retention"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">EngageHub</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Log in
            </Button>
            <Button onClick={() => navigate("/login")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background/40 to-primary/5">
        <div className="container mx-auto px-4 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge className="w-fit">Employee Engagement Platform</Badge>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Employee engagement you can{" "}
                <span className="text-primary">build and orchestrate</span> in real time
              </h1>
              <p className="text-xl text-muted-foreground">
                Transform workplace culture with intelligent surveys, real-time feedback, and actionable insights that drive meaningful change.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" onClick={() => navigate("/login")} className="gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
                  Request Demo
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Free 14-day trial
                </div>
              </div>
            </div>
            <div className="relative">
              <Card className="rounded-xl shadow-xl lg:shadow-2xl">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Team Engagement Score</h3>
                        <p className="text-3xl font-bold text-primary">4.2/5</p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className={`h-5 w-5 ${i <= 4 ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Survey Response Rate</span>
                        <span className="font-semibold">78%</span>
                      </div>
                      <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[78%]" />
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">127</p>
                          <p className="text-xs text-muted-foreground">Employees</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">8</p>
                          <p className="text-xs text-muted-foreground">Active Surveys</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">+12%</p>
                          <p className="text-xs text-muted-foreground">Growth</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">Features</Badge>
            <h2 className="text-4xl font-bold mb-4">
              Create anything. Orchestrate everything.
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to build a thriving workplace culture with engaged employees and data-driven decisions
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="text-center mt-12">
            <Button size="lg" onClick={() => navigate("/login")}>
              Explore All Features
            </Button>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">Use Cases</Badge>
            <h2 className="text-4xl font-bold mb-4">
              Built for every team
            </h2>
            <p className="text-xl text-muted-foreground">
              From HR teams to executives, EngageHub adapts to your unique needs
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <Card key={index} className="bg-gradient-to-br from-primary/5 to-background hover:shadow-xl transition-shadow">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-3">{useCase.title}</h3>
                  <p className="text-muted-foreground mb-6">{useCase.description}</p>
                  <div className="pt-6 border-t">
                    <p className="text-2xl font-bold text-primary">{useCase.metric}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary/90 to-primary/80">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold text-primary-foreground">
              Realize your business&apos;s full potential
            </h2>
            <p className="text-xl text-primary-foreground/90">
              Join hundreds of companies using EngageHub to build better workplace cultures
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" variant="secondary" onClick={() => navigate("/login")} className="gap-2">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/login")} className="bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10">
                Talk to Sales
              </Button>
            </div>
            <div className="flex items-center justify-center gap-8 text-primary-foreground/80 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Free 14-day trial
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="font-bold">EngageHub</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Employee engagement platform built for the modern workplace
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/login")} className="hover:text-foreground">Features</button></li>
                <li><button onClick={() => navigate("/login")} className="hover:text-foreground">Pricing</button></li>
                <li><button onClick={() => navigate("/login")} className="hover:text-foreground">Security</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/login")} className="hover:text-foreground">About</button></li>
                <li><button onClick={() => navigate("/login")} className="hover:text-foreground">Blog</button></li>
                <li><button onClick={() => navigate("/login")} className="hover:text-foreground">Careers</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/login")} className="hover:text-foreground">Help Center</button></li>
                <li><button onClick={() => navigate("/login")} className="hover:text-foreground">Contact</button></li>
                <li><button onClick={() => navigate("/login")} className="hover:text-foreground">API Docs</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 EngageHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
