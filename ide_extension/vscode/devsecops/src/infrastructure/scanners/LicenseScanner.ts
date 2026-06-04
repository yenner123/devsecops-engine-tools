import { OutputChannel } from "vscode";
import { exec } from "child_process";
import IScannerGateway from "../../domain/model/gateways/IScannerGateway";
import { ScannerRes } from "../../domain/model/ScannerRes";
import { Finding } from "../../domain/model/Finding";
import { ISeverityCounts } from "../../domain/model/mappers/Mappers";
import { ScanConfigurationService } from "../config/ScanConfigurationService";
import { ScannerImageManager } from "../helper/ScannerImageManager";
import ContainerEngineManager from "../helper/ContainerEngineManager";
import { BaseScannerHelper } from "../helper/BaseScannerHelper";
import { ScanContextMapper } from "../mappers/ScanContextMapper";
import { MetricsService } from "../services/MetricsService";
import { DockerService } from "../services/DockerService";
import { ErrorHandlingService } from "../services/ErrorHandlingService";

export class LicenseScanner implements IScannerGateway {
  private metricsHelper = new MetricsService();
  private dockerErrorHandler = new DockerService();
  private networkErrorHandler = new ErrorHandlingService();

  async scan(
    elementToScan: string,
    outputChannel: OutputChannel,
    containerImageName: string,
    toolVersion?: string,
    containerEnginePath?: string,
    _dependenciesToken?: string,
    _xrayMode?: string,
    _dependenciesTool?: string,
    _dependencyCheckDatabase?: string,
    scanLoader?: any
  ): Promise<ScannerRes> {
    const startTime = BaseScannerHelper.initializeScan(
      outputChannel,
      this.metricsHelper,
      this.dockerErrorHandler,
      this.networkErrorHandler
    );

    return new Promise((resolve, _reject) => {
      let scanResult = false;
      let findings: Finding[] = [];
      let severityCounts: ISeverityCounts | null = null;

      void (async () => {
        try {
          const resolvedEnginePath = containerEnginePath || "docker";
          const scannerImageAvailable = await ScannerImageManager.ensureScannerImageExists(
            resolvedEnginePath,
            containerImageName,
            outputChannel,
            (message) => this.metricsHelper.captureOnly(message)
          );

          if (!scannerImageAvailable) {
            await BaseScannerHelper.handleScanFailure(
              elementToScan,
              new Error("Failed to ensure scanner image is available"),
              "scanner image availability",
              "engine_license",
              this.metricsHelper,
              outputChannel,
              resolve,
              undefined,
              startTime
            );
            return;
          }

          if (scanLoader) {
            scanLoader.start(`Licenses for: ${elementToScan.split('/').pop() || elementToScan}`);
          }

          const timeout = BaseScannerHelper.createScanTimeout(
            outputChannel,
            this.metricsHelper,
            elementToScan,
            "engine_license",
            () => resolve(new ScannerRes(false, [], null)),
            startTime
          );

          const normalizedElementPath = ContainerEngineManager.normalizePathForDocker(elementToScan);
          const versionEnv = toolVersion ? `-e ENGINE_VERSION=${toolVersion}` : "";
          const customConfigPath = ScanConfigurationService.getCustomRemoteConfigPath();
          const remoteConfigVolume = customConfigPath
            ? `-v "${ContainerEngineManager.normalizePathForDocker(customConfigPath)}:/app/ms_remote_config"`
            : "";
          const remoteConfigRepo = customConfigPath ? "ms_remote_config" : "docker_default_remote_config";
          const containerCommand = `${resolvedEnginePath} run --rm ${versionEnv} ${remoteConfigVolume} -v ${normalizedElementPath}:/ms_artifact ${containerImageName} sh -c "devsecops-engine-tools --platform_devops local --remote_config_source local --remote_config_repo ${remoteConfigRepo} --module engine_license --tool grant --folder_path /ms_artifact --context true"`;

          const debugMode = ScanConfigurationService.getDebugMode();

          const childProcess = exec(containerCommand, (error, stdout, stderr) => {
            clearTimeout(timeout);

            if (error) {
              this.metricsHelper.handleScanError(
                error,
                stderr,
                containerImageName,
                toolVersion || "",
                outputChannel,
                this.dockerErrorHandler,
                this.networkErrorHandler
              );
            }

            if (stdout) {
              const result = ScanContextMapper.extractContextFromOutput(stdout, "license");

              if (result.success) {
                findings = result.findings;
                severityCounts = result.severityCounts;
                scanResult = true;
                this.metricsHelper.captureLog(outputChannel, `Successfully extracted context data with ${findings.length} findings`);
              } else {
                outputChannel.appendLine(result.errorMessage || "No context data found in scanner output");
                scanResult = false;
              }

              BaseScannerHelper.handleDebugOutput(outputChannel, debugMode, stderr, result.normalOutput);
            } else {
              outputChannel.appendLine("Container command completed with no output");
            }

            void BaseScannerHelper.completeScan(
              elementToScan,
              findings,
              severityCounts,
              scanResult,
              "engine_license",
              this.metricsHelper,
              outputChannel,
              resolve,
              startTime
            );
          });

          childProcess.on("exit", (code) => {
            if (code !== 0 && code !== null) {
              this.metricsHelper.captureExitCode(outputChannel, code);
            }
          });
        } catch (error) {
          await BaseScannerHelper.handleScanFailure(
            elementToScan,
            error,
            "during license scanning",
            "engine_license",
            this.metricsHelper,
            outputChannel,
            resolve,
            undefined,
            startTime
          );
        }
      })();
    });
  }
}
