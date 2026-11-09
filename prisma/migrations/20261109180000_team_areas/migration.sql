-- Equipe: cada pessoa tem uma ou mais áreas (guias existentes entram como GUIA)
-- e o acesso à Central (usuário Shopify) pode ser ligado a uma pessoa.
ALTER TABLE "Guide" ADD COLUMN "areas" TEXT[] NOT NULL DEFAULT ARRAY['GUIA']::TEXT[];
ALTER TABLE "CentralUser" ADD COLUMN "guideId" TEXT;
CREATE UNIQUE INDEX "CentralUser_guideId_key" ON "CentralUser"("guideId");
