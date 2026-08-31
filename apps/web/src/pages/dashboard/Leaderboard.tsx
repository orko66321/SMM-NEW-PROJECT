import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { LeaderboardSection } from "../../components/leaderboard/LeaderboardSection.js";

export default function Leaderboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">{t("leaderboard.pageTitle")}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t("leaderboard.pageSubtitle")}</p>
      </div>
      <LeaderboardSection currentUserId={user?.id} isAdmin={user?.role === "ADMIN" || user?.role === "MODERATOR"} />
    </div>
  );
}
