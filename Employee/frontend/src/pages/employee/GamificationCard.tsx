import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface GamificationCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export default function GamificationCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
}: GamificationCardProps) {
  return (
    <Card className="emp-card hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={`p-4 rounded-full ${bgColor}`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
