import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import { ResultsTreeDataProvider } from "../tree/ResultsTreeDataProvider";
import { licenseScanRequest } from "../application/InitEngineCore";
import { ScanConfiguration } from "../domain/model/ScanConfiguration";
import { ScanOutputLoader } from "../infrastructure/helper/LoadingAnimator";
import { ErrorHandlingService } from "../infrastructure/services/ErrorHandlingService";

export function registerLicenseScanCommand(
  _context: vscode.ExtensionContext,
  treeDataProvider: ResultsTreeDataProvider
): vscode.Disposable {
  const licenseScanDisposable = vscode.commands.registerCommand("devsecops.licenseScan", async () => {
    const selectedFolder = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      defaultUri:
        vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
          ? vscode.Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, ""))
          : vscode.Uri.file(os.homedir()),
      openLabel: "Select Folder",
    });

    if (selectedFolder && selectedFolder.length > 0) {
      let folderPath = selectedFolder[0].fsPath;
      folderPath = folderPath.replace(/^file:\/\//, "");

      void vscode.window.showInformationMessage(`DevSecOps License Scanning: ${folderPath}`);

      let useCase;
      try {
        useCase = await licenseScanRequest();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        void vscode.window.showErrorMessage(`License Scan configuration error: ${errorMessage}`);
        return;
      }

      const outputChannel = vscode.window.createOutputChannel("License Scan Results");
      outputChannel.clear();

      const scanLoader = new ScanOutputLoader(outputChannel);

      const scanId = treeDataProvider.addLoadingScanResult(
        `License: ${folderPath.split('/').pop() || 'folder'}`,
        "license",
        outputChannel
      );

      try {
        const scanResult = await useCase.scan(folderPath, outputChannel, new ScanConfiguration(), scanLoader);

        if (scanResult) {
          scanLoader.stop(scanResult.getFindings().length, "license");

          void vscode.window.showInformationMessage("License Scan completed successfully");

          treeDataProvider.updateScanResult(
            scanId,
            scanResult.getFindings(),
            "license",
            folderPath
          );
        } else {
          scanLoader.showError("License Scan failed - No results returned");
          void vscode.window.showErrorMessage("License Scan failed - Check Output for details");
          treeDataProvider.updateScanResultWithError(scanId, "No results returned");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        scanLoader.showError(`License Scan failed: ${errorMessage}`);
        const userMessage = ErrorHandlingService.isVpnError(errorMessage)
          ? "Cannot reach the microservice. Please check your VPN or internal Wi-Fi connection and try again."
          : ErrorHandlingService.isSelfSignedCertificateError(errorMessage)
          ? "SSL certificate error: self-signed certificate detected. Please update your certificates and try again."
          : ErrorHandlingService.isMicroserviceError(errorMessage)
          ? "The microservice is unavailable or the connection was interrupted. Please try again."
          : "License Scan failed - Check Output for details";
        void vscode.window.showErrorMessage(userMessage);
        treeDataProvider.updateScanResultWithError(scanId, errorMessage);
      }
    }
  });

  return licenseScanDisposable;
}
