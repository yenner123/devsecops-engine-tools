/**
 * Infrastructure Layer - Barrel exports
 * 
 * Centralized exports for clean imports across the application
 */

// Executors
export { IScanExecutor, IScanExecutionConfig, IScanExecutionResult } from './executors/IScanExecutor';
export { RemoteMicroserviceExecutor } from './executors/RemoteMicroserviceExecutor';
export { ScanExecutionOrchestrator } from './executors/ScanExecutionOrchestrator';

// Scanners
export { ImageScanner } from './scanners/ImageScanner';
export { DependenciesScanner } from './scanners/DependenciesScanner';
export { IacScanner } from './scanners/IacScanner';
export { LicenseScanner } from './scanners/LicenseScanner';

// Clients
export { RestClient } from './clients/RestClient';

// Services
export { DockerService } from './services/DockerService';
export { ErrorHandlingService } from './services/ErrorHandlingService';
export { MetricsService } from './services/MetricsService';

// Configuration
export { ScanConfigurationService } from './config/ScanConfigurationService';

// Mappers
export { ScanContextMapper } from './mappers/ScanContextMapper';

// Helpers (commonly used)
export { default as ContainerEngineManager } from './helper/ContainerEngineManager';
export { ScanOutputLoader } from './helper/LoadingAnimator';
export { StringUtils } from './helper/StringUtils';
