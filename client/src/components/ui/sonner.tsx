import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      richColors
      className="toaster group"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "!rounded-none !border !shadow-[0_18px_36px_rgba(20,40,30,0.2)] !font-body !p-4 !gap-3",
          default: "!bg-[#f8f2e8] !border-[#a58c6d]/60",
          title: "!font-body !font-semibold !text-[0.92rem]",
          description:
            "!font-body !text-[0.8rem] !leading-relaxed !mt-1 !opacity-90",
          icon: "!mt-0.5",
          actionButton:
            "!bg-[#c94a20] !text-white !font-mono-ui !text-[0.6rem] !font-semibold !uppercase !tracking-[0.08em] !rounded-none",
          cancelButton:
            "!bg-transparent !border !border-[#a58c6d]/60 !text-[#365649] !font-mono-ui !text-[0.6rem] !font-semibold !uppercase !tracking-[0.08em] !rounded-none",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
