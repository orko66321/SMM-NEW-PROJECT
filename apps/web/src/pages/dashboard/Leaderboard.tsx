import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { LeaderboardSection } from "../../components/leaderboard/LeaderboardSection.js";
import { GlassPage, PageHeader } from "../../components/dashboard/GlassPage.js";

export default function Leaderboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <GlassPage>
      <PageHeader
        kicker={t("dashboardLayout.nav.leaderboard")}
        title={t("leaderboard.pageTitle")}
        subtitle={t("leaderboard.pageSubtitle")}
      />
      <LeaderboardSection currentUserId={user?.id} isAdmin={user?.role === "ADMIN" || user?.role === "MODERATOR"} />
    </GlassPage>
  );
}
