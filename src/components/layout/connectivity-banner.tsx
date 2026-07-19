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
    ? (language === "ar" ? "أوفلاين · تمرينك محفوظ" : "Offline · workout saved")
    : syncing
      ? (language === "ar" ? "بنزامن التعديلات" : "Syncing changes")
      : (language === "ar" ? `${pending} تعديل مستني` : `${pending} pending`);

  return (
    <Pressable
      disabled={offline || syncing}
      onPress={() => void syncNow()}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        flexDirection: rowDirection,
        alignItems: "center",
        gap: 7,
        backgroundColor: offline ? colors.warningSoft : colors.infoSoft,
        borderColor: offline ? colors.warning : colors.info,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        minHeight: 34,
        opacity: pressed ? 0.74 : 1,
      })}
    >
      {offline ? <CloudOff size={14} color={colors.warning} /> : syncing ? <RefreshCw size={14} color={colors.info} /> : <UploadCloud size={14} color={colors.info} />}
      <View style={{ minWidth: 0 }}><AppText variant="caption" color={offline ? "warning" : "default"}>{label}</AppText></View>
    </Pressable>
  );
}
