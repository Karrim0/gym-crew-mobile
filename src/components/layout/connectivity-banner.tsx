import { Pressable, View } from "react-native";
import { CloudOff, RefreshCw, UploadCloud } from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useConnectivityStore } from "@/stores/connectivity-store";

export function ConnectivityBanner() {
  const { colors } = useAppTheme();
  const { language, rowDirection } = useTranslation();
  const isConnected = useConnectivityStore((state) => state.isConnected && state.isInternetReachable);
  const pending = useConnectivityStore((state) => state.pending);
  const syncing = useConnectivityStore((state) => state.syncing);
  const syncNow = useConnectivityStore((state) => state.syncNow);
  if (isConnected && pending === 0 && !syncing) return null;
  const offline = !isConnected;
  const label = offline
    ? (language === "ar" ? "أوفلاين — تمرينك بيتحفظ على الجهاز" : "Offline — your workout is saved on this device")
    : syncing
      ? (language === "ar" ? "بنزامن بياناتك..." : "Syncing your data...")
      : (language === "ar" ? `${pending} تعديل مستني المزامنة` : `${pending} change${pending === 1 ? "" : "s"} waiting to sync`);
  return (
    <Pressable
      disabled={offline || syncing}
      onPress={() => void syncNow()}
      style={{
        flexDirection: rowDirection,
        alignItems: "center",
        gap: 10,
        backgroundColor: offline ? colors.warningSoft : colors.infoSoft,
        borderColor: offline ? colors.warning : colors.info,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        minHeight: 46,
      }}
    >
      {offline ? <CloudOff size={18} color={colors.warning} /> : syncing ? <RefreshCw size={18} color={colors.info} /> : <UploadCloud size={18} color={colors.info} />}
      <View style={{ flex: 1, minWidth: 0 }}><AppText variant="smallBold" color={offline ? "warning" : "default"}>{label}</AppText></View>
    </Pressable>
  );
}
