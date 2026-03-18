import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/modules/auth/AuthContext";
import CheckboxField from "@/modules/ui/CheckboxField";
import { getPreferences, getProfile, updatePreferences, updateProfile } from "@/modules/api/me";

const ALL_INTERESTS = [
  "Technology & Coding",
  "Travel & Adventure",
  "Music & Arts",
  "Sports & Fitness",
  "Reading & Learning",
] as const;

const ALL_MOTIVATIONS = [
  "Learning new technologies",
  "Making a meaningful impact",
  "Collaborating with great people",
  "Solving complex problems",
  "Recognition for achievements",
  "Having autonomy in my work",
] as const;

const TIMEZONES = [
  { value: "UTC-08:00", label: "UTC-08:00 (PST)" },
  { value: "UTC-05:00", label: "UTC-05:00 (CT/CO)" },
  { value: "UTC-04:00", label: "UTC-04:00 (ET)" },
  { value: "UTC+00:00", label: "UTC+00:00 (GMT)" },
  { value: "UTC+01:00", label: "UTC+01:00" },
  { value: "UTC+05:30", label: "UTC+05:30 (IST)" },
];

function capitalizeWords(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export default function EmployeeSettings() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingWorkStyle, setSavingWorkStyle] = useState(false);

  const [dirtyProfile, setDirtyProfile] = useState(false);
  const [dirtyWorkStyle, setDirtyWorkStyle] = useState(false);
  const loadedForUserRef = useRef<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [location, setLocation] = useState("");
  const [timezone, setTimezone] = useState("UTC-05:00");
  const [bio, setBio] = useState("");
  const [funFact, setFunFact] = useState("");
  const [emoji, setEmoji] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  const [motivations, setMotivations] = useState<string[]>([]);
  const [learningPref, setLearningPref] = useState("");

  const canLoad = !!user?.id;

  useEffect(() => {
    if (authLoading) return;
    if (!canLoad) {
      setLoading(false);
      return;
    }
    if (loadedForUserRef.current === user!.id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [{ profile }, { preferences }] = await Promise.all([
          getProfile(user!.id, user!.email || undefined),
          getPreferences(user!.id),
        ]);

        if (!mounted) return;

        if (profile) {
          if (!dirtyProfile) {
            let f = profile.first_name || "";
            let l = profile.last_name || "";
            if ((!f || !l) && profile.full_name) {
              const parts = String(profile.full_name).trim().split(/\s+/);
              f = f || (parts[0] || "");
              l = l || (parts.slice(1).join(" ") || "");
            }

            setFirstName(String(f || ""));
            setLastName(String(l || ""));
            setLocation(String(profile.location || ""));
            setTimezone(String(profile.timezone || "UTC-05:00"));
            setBio(String(profile.bio || ""));
            setFunFact(String(profile.fun_fact || ""));
            setEmoji(String(profile.emoji || ""));
            setInterests(Array.isArray(profile.interests) ? profile.interests : []);
          }
        }

        if (preferences) {
          if (!dirtyWorkStyle) {
            setMotivations(Array.isArray(preferences.motivations) ? preferences.motivations : []);
            setLearningPref(String(preferences.learning_pref || ""));
          }
        }

        loadedForUserRef.current = user!.id;
      } catch (e: any) {
        toast({
          title: "Failed to load settings",
          description: e?.message || "Please refresh and try again.",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [authLoading, canLoad, user?.id, user?.email, dirtyProfile, dirtyWorkStyle]);

  const fullName = useMemo(() => {
    const f = capitalizeWords(firstName || "");
    const l = capitalizeWords(lastName || "");
    return `${f} ${l}`.trim();
  }, [firstName, lastName]);

  const disableProfileFields = savingProfile;
  const disableWorkStyleFields = savingWorkStyle;

  const toggle = (list: string[], v: string, on: boolean) => {
    if (on) return Array.from(new Set([...list, v]));
    return list.filter((x) => x !== v);
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    setSavingProfile(true);
    try {
      await updateProfile(user.id, {
        first_name: capitalizeWords(firstName || ""),
        last_name: capitalizeWords(lastName || ""),
        full_name: fullName || undefined,
        location: location || null,
        timezone: timezone || null,
        bio: bio || null,
        fun_fact: funFact || null,
        emoji: emoji || null,
        interests,
        email: user.email || null,
      });
      setDirtyProfile(false);
      loadedForUserRef.current = user.id;
      toast({ title: "Profile updated" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveWorkStyle = async () => {
    if (!user?.id) return;
    setSavingWorkStyle(true);
    try {
      await updatePreferences(user.id, {
        motivations,
        learning_pref: learningPref || null,
      });
      setDirtyWorkStyle(false);
      loadedForUserRef.current = user.id;
      toast({ title: "Work style updated" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSavingWorkStyle(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Update your onboarding information anytime.</p>
      </div>

      <Card className="emp-card">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={firstName} onChange={(e) => { setFirstName(e.target.value); setDirtyProfile(true); }} disabled={disableProfileFields} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={lastName} onChange={(e) => { setLastName(e.target.value); setDirtyProfile(true); }} disabled={disableProfileFields} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Location & Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={location} onChange={(e) => { setLocation(e.target.value); setDirtyProfile(true); }} placeholder="City, Country" disabled={disableProfileFields} />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={(v) => setTimezone(v)}>
                  <SelectTrigger disabled={disableProfileFields}>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((z) => (
                      <SelectItem key={z.value} value={z.value} label={z.label}>
                        {z.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => { setBio(e.target.value); setDirtyProfile(true); }} rows={4} disabled={disableProfileFields} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Personal Touches</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fun Fact About You</Label>
                <Input value={funFact} onChange={(e) => { setFunFact(e.target.value); setDirtyProfile(true); }} placeholder="I can solve a Rubik's cube..." disabled={disableProfileFields} />
              </div>
              <div className="space-y-2">
                <Label>Favorite Emoji</Label>
                <Input value={emoji} onChange={(e) => { setEmoji(e.target.value); setDirtyProfile(true); }} placeholder="e.g. ✨" disabled={disableProfileFields} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Interests & Hobbies</h3>
            <div className="grid grid-cols-1 gap-2">
              {ALL_INTERESTS.map((label) => (
                <CheckboxField
                  key={label}
                  id={`interest-${label}`}
                  label={label}
                  checked={interests.includes(label)}
                  onChange={(v) => { setInterests((prev) => toggle(prev, label, v)); setDirtyProfile(true); }}
                  disabled={disableProfileFields}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="emp-btn-inline" onClick={saveProfile} disabled={authLoading || loading || savingProfile || !user?.id}>
              {savingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="emp-card">
        <CardHeader>
          <CardTitle>Work Style & Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Work Environment & Motivation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ALL_MOTIVATIONS.map((label) => (
                <CheckboxField
                  key={label}
                  id={`mot-${label}`}
                  label={label}
                  checked={motivations.includes(label)}
                  onChange={(v) => { setMotivations((prev) => toggle(prev, label, v)); setDirtyWorkStyle(true); }}
                  disabled={disableWorkStyleFields}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>How do you prefer to learn new things?</Label>
            <Textarea
              value={learningPref}
              onChange={(e) => { setLearningPref(e.target.value); setDirtyWorkStyle(true); }}
              rows={4}
              placeholder="Tell us how you like to learn (docs, pairing, videos, workshops, etc.)"
              disabled={disableWorkStyleFields}
            />
          </div>

          <div className="flex justify-end">
            <Button className="emp-btn-inline" onClick={saveWorkStyle} disabled={authLoading || loading || savingWorkStyle || !user?.id}>
              {savingWorkStyle ? "Saving..." : "Save Work Style"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
