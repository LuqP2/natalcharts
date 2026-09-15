# Mandala Natal

MVP público e estático para gerar uma mandala natal tropical completa no
navegador. Não existe backend, conta, banco de dados, interpretação ou
telemetria. Data, hora e local de nascimento não são enviados a nenhum
serviço.

## O que está incluído

- busca mundial com 34 mil cidades do GeoNames e entrada manual de coordenadas;
- conversão do horário local pelo fuso IANA histórico, incluindo detecção de
  horas duplicadas e inexistentes durante mudanças de horário de verão;
- Swiss Ephemeris em WebAssembly, carregando efemérides locais de 1800–2399;
- zodíaco tropical, casas Placidus, dez planetas, nodos verdadeiros, ASC/MC e
  cinco aspectos maiores;
- substituição polar por Porphyry comunicada ao usuário;
- mandala SVG responsiva em um único estilo editorial.

## Desenvolvimento

Requer Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Validação:

```bash
npm test
npx tsc --noEmit
npm run build
```

O build estático é criado em `out/`.

## Arquitetura

O formulário resolve a cidade e o instante UTC no navegador. Um Web Worker
carrega o WebAssembly e os arquivos `public/ephe/sepl_18.se1` e
`public/ephe/semo_18.se1`, calcula o mapa e devolve um `ChartData` serializável.
O componente SVG conhece apenas esse contrato, não a biblioteca astronômica.

O plano inicial citava `@kuntay/swisseph` 0.3.0, mas essa versão não está
publicada no npm. O projeto fixa as versões realmente disponíveis 0.2.2 do
motor e do pacote de dados. O índice geográfico é gerado diretamente dos
arquivos oficiais do GeoNames pelo script `scripts/build-geonames.mjs`.

## Atualizar a base GeoNames

Baixe `cities15000.zip`, `countryInfo.txt` e `admin1CodesASCII.txt` de
<https://download.geonames.org/export/dump/> e execute:

```bash
node scripts/build-geonames.mjs cities15000.txt countryInfo.txt admin1CodesASCII.txt public/data
```

## GitHub Pages

O workflow `.github/workflows/deploy.yml` executa testes, checagem de tipos,
build e publicação. No repositório do GitHub, configure Pages para usar
**GitHub Actions**. O `basePath` é derivado automaticamente do nome do
repositório durante o workflow.

## Licenças e dados

- aplicação: GNU Affero General Public License v3.0 ou posterior;
- Swiss Ephemeris e bindings: AGPL-3.0-or-later;
- dados de localidades GeoNames: CC BY 4.0;
- Noto Sans Symbols 2: SIL Open Font License 1.1.

Consulte [NOTICE.md](NOTICE.md) para atribuições.
