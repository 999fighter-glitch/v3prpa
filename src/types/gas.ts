export interface GasScriptRunMethods {
  gasGetConfig: () => void;
  gasGetTargetSheetUrl: (tempohTugasan: string, firstDateHeader: string, fallbackUrl?: string) => void;
  gasCheckDriveFolder: (folderUrl: string) => void;
  gasTestDriveWrite: (folderUrl: string) => void;
  gasSaveConfig: (config: unknown) => void;
  gasSubmitApplication: (payload: unknown) => void;
  gasGetStaffDirectory: (fallbackUrl?: string) => void;
  gasLookupStaffPhone: (namaPemohon: string, fallbackUrl?: string, email?: string) => void;
  gasSaveStaffPhone: (data: unknown) => void;
  getGoogleUserSession: () => void;
}

export interface GasScriptRunRunner {
  withSuccessHandler: (cb: (res: unknown) => void) => {
    withFailureHandler: (errCb: (err: unknown) => void) => GasScriptRunMethods;
  };
}

declare global {
  interface Window {
    google?: {
      script?: {
        run?: GasScriptRunRunner;
      };
    };
  }
}
