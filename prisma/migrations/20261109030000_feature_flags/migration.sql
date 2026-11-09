-- Funcionalidades opcionais: tudo novo chega desligado até o administrador ligar.
ALTER TABLE "BusinessSetting" ADD COLUMN "featureFlags" JSONB;
