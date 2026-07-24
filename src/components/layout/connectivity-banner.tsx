import { Pressable, View } from "react-native";
import {
  CircleHelp,
  CloudOff,
  RefreshCw,
  UploadCloud,
} from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useConnectivityStore } from "@/stores/connectivity-store";

export function ConnectivityBanner() {
  const { colors } = useAppTheme();
  const { language, rowDirection } = useTranslation();
  const networkStatus = useConnectivityStore((state) => state.networkStatus);
  const pending = useConnectivityStore((state) => state.pending);
  const syncing = useConnectivityStore((state) => state.syncing);
  const syncNow = useConnectivityStore((state) => state.syncNow);

  if (networkStatus === "online" && pending === 0 && !syncing) return null;

  const offline = networkStatus === "offline";
  const unknown = networkStatus === "unknown";
  const label = offline
    ? language === "ar"
      ? "أوفلاين · تمرينك محفوظ"
      : "Offline · workout saved"
    : syncing
      ? language === "ar"
        ? "بنزامن التعديلات"
        : "Syncing changes"
      : unknown
        ? language === "ar"
          ? "الاتصال غير مؤكد · بياناتك آمنة"
          : "Connection unknown · data is safe"
        : language === "ar"
          ? `${pending} تعديل مستني`
          : `${pending} pending`;

  const Icon = offline
    ? CloudOff
    : syncing
      ? RefreshCw
      : unknown
        ? CircleHelp
        : UploadCloud;
  const tone = offline ? colors.warning : colors.info;

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
        borderColor: tone,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        minHeight: 34,
        opacity: pressed ? 0.74 : 1,
      })}
    >
      <Icon size={14} color={tone} />
      <View style={{ minWidth: 0 }}>
        <AppText
          variant="caption"
          color={offline ? "warning" : "default"}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
