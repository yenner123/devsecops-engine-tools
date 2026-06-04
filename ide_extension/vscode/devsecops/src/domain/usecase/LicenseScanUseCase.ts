import { OutputChannel } from "vscode";
import { ILicenseScanUseCase } from "./interfaces/ILicenseScanUseCase";
import IScannerGateway from "../model/gateways/IScannerGateway";
import { ScannerRes } from "../model/ScannerRes";
import { ScanConfiguration } from "../model/ScanConfiguration";
import { ScanExecutionOrchestrator } from "../../infrastructure/executors/ScanExecutionOrchestrator";
import { IScanExecutionConfig } from "../../infrastructure/executors/IScanExecutor";
import { ScanContextMapper } from "../../infrastructure/mappers/ScanContextMapper";
import { MetricsService } from "../../infrastructure/services/MetricsService";

export class LicenseScanUseCase implements ILicenseScanUseCase {
  constructor(
    private licenseScanner: IScannerGateway,
    private containerImageVersion: string,
    private containerEnginePath: string
  ) {}

  async scan(
    folderToScan: string,
    outputChannel: OutputChannel,
    scanConfiguration: ScanConfiguration,
    scanLoader: any
  ): Promise<ScannerRes> {
    const executor = await ScanExecutionOrchestrator.selectExecutor();
    await ScanExecutionOrchestrator.getExecutionModeStatus(outputChannel);

    if (executor.getExecutionMode() === "remote-microservice") {
      outputChannel.show();

      const metricsService = new MetricsService();
      metricsService.clearLogs();
      const startTime = Date.now();

      try {
        const scanConfig: IScanExecutionConfig = {
          scanType: "license",
          target: folderToScan,
          containerImageName: scanConfiguration.getContainerImageName(),
          engineToolsVersion: this.containerImageVersion,
          containerEnginePath: this.containerEnginePath,
          additionalArgs: {
            "--tool": "grant",
          },
        };

        const logCapture = (message: string) => metricsService.captureOnly(message);
        const result = await executor.execute(scanConfig, outputChannel, logCapture);

        if (!result.success || !result.contextJson) {
          throw new Error(result.error || "Remote scan failed");
        }

        const mappedResult = ScanContextMapper.parseAndMapContext(result.contextJson, "license");

        if (!mappedResult.success) {
          throw new Error(mappedResult.errorMessage || "Failed to parse scan results");
        }

        try {
          await metricsService.collectAndstoreMetricsData(
            folderToScan,
            mappedResult.findings,
            mappedResult.severityCounts,
            mappedResult.success,
            "engine_license",
            "remote-microservice",
            result.executionTime ?? 0
          );
        } catch (metricsError) {
          console.error("Failed to send metrics:", metricsError);
        }

        return new ScannerRes(mappedResult.success, mappedResult.findings, mappedResult.severityCounts);
      } catch (error) {
        metricsService.captureError(outputChannel, error, "remote scan execution");
        await metricsService.collectFailedScanMetrics(
          folderToScan,
          "engine_license",
          "remote-microservice",
          Date.now() - startTime
        );
        throw error;
      }
    }

    return await this.licenseScanner.scan(
      folderToScan,
      outputChannel,
      scanConfiguration.getContainerImageName(),
      this.containerImageVersion,
      this.containerEnginePath,
      undefined,
      undefined,
      undefined,
      undefined,
      scanLoader
    );
  }
}
