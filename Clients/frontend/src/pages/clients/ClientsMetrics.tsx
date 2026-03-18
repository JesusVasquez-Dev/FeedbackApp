import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, FileText, TrendingUp, Bot, Send } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type LocalMessage = { role: "user" | "assistant"; content: string };

export default function ClientsMetrics() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setIsLoading(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "This is a demo metrics assistant. Connect me to your backend or data warehouse to answer real analytics questions.",
        },
      ]);
      setIsLoading(false);
    }, 600);
  };

  const metrics = [
    {
      title: "Total Employees",
      value: "127",
      change: "+12%",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Active Surveys",
      value: "8",
      change: "+2",
      icon: FileText,
      color: "text-green-500",
    },
    {
      title: "Response Rate",
      value: "78%",
      change: "+5%",
      icon: TrendingUp,
      color: "text-purple-500",
    },
    {
      title: "Satisfaction Score",
      value: "4.2",
      change: "+0.3",
      icon: BarChart3,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clients Metrics</h1>
        <p className="text-muted-foreground mt-2">
          Overview of company performance and employee engagement
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="emp-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-500">{metric.change}</span> from last month
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="emp-card">
          <CardHeader>
            <CardTitle>Employee Distribution</CardTitle>
            <CardDescription>By department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Engineering', 'Sales', 'Marketing', 'Operations'].map((dept, idx) => (
                <div key={idx} className="flex items-center">
                  <div className="w-32 text-sm">{dept}</div>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2" 
                      style={{ width: `${(idx + 1) * 20}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm text-muted-foreground">
                    {(idx + 1) * 20}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="emp-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "New employee joined", time: "2 hours ago" },
                { action: "Survey completed", time: "5 hours ago" },
                { action: "Feedback submitted", time: "1 day ago" },
                { action: "New survey created", time: "2 days ago" },
              ].map((activity, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <p className="text-sm">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Assistant Chat */}
      <Card className="emp-card h-[500px] flex flex-col">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>AI Assistant</CardTitle>
          </div>
          <CardDescription>
            Ask questions about employees, schedules, or generate reports
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3">
          <ScrollArea className="flex-1 pr-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Bot className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">Welcome! How can I assist you?</p>
                <p className="text-sm">Try asking:</p>
                <ul className="text-sm mt-3 space-y-1 text-left max-w-md mx-auto">
                  <li>• "How many pending KPI surveys do I have?"</li>
                  <li>• "Generate a summary report for this week"</li>
                  <li>• "What are the upcoming important dates?"</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`rounded-lg px-4 py-3 max-w-[80%] ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon" className="emp-btn-inline">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}