import { IacScanner } from "../infrastructure/scanners/IacScanner";
import { IacScanUseCase } from "../domain/usecase/IacScanUseCase";
import { RestClient } from "../infrastructure/clients/RestClient";
import { ImageScanner } from "../infrastructure/scanners/ImageScanner";
import { ImageScanUseCase } from "../domain/usecase/ImageScanUseCase";
import { DependenciesScanUseCase } from "../domain/usecase/DependenciesScanUseCase";
import { DependenciesScanner } from "../infrastructure/scanners/DependenciesScanner";
import { LicenseScanUseCase } from "../domain/usecase/LicenseScanUseCase";
import { LicenseScanner } from "../infrastructure/scanners/LicenseScanner";
import ContainerEngineManager from "../infrastructure/helper/ContainerEngineManager";
import { ScanConfiguration } from "../domain/model/ScanConfiguration";
import { ScanConfigurationService } from "../infrastructure/config/ScanConfigurationService";

export async function iacScanRequest(): Promise<IacScanUseCase> {
    const containerEnginePath = ContainerEngineManager.getContainerEnginePath();
    const engineToolsVersion = await resolveAndValidateVersion();
    const iacScanUseCase = new IacScanUseCase(new IacScanner(), new RestClient(), engineToolsVersion, containerEnginePath);
    return iacScanUseCase;
}

export async function imageScanRequest(): Promise<ImageScanUseCase>{
    const containerEnginePath = ContainerEngineManager.getContainerEnginePath();
    const engineToolsVersion = await resolveAndValidateVersion();
    const imageScanUseCase = new ImageScanUseCase(new ImageScanner(), engineToolsVersion, containerEnginePath);
    return imageScanUseCase;
}

export async function dependenciesScanRequest(): Promise<DependenciesScanUseCase> {
    const containerEnginePath = ContainerEngineManager.getContainerEnginePath();
    const engineToolsVersion = await resolveAndValidateVersion();
    const dependenciesScanUseCase = new DependenciesScanUseCase(new DependenciesScanner(), engineToolsVersion, containerEnginePath);
    return dependenciesScanUseCase;
}

export async function licenseScanRequest(): Promise<LicenseScanUseCase> {
    const containerEnginePath = ContainerEngineManager.getContainerEnginePath();
    const engineToolsVersion = await resolveAndValidateVersion();
    const licenseScanUseCase = new LicenseScanUseCase(new LicenseScanner(), engineToolsVersion, containerEnginePath);
    return licenseScanUseCase;
}

async function resolveAndValidateVersion(): Promise<string> {
    const config = new ScanConfiguration();
    const version = config.getEngineToolsVersion();
    if (version) {
        await ScanConfigurationService.validateEngineToolsVersion(version);
    }
    return version;
}