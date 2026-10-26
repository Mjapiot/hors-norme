#!/bin/sh
# Avant `xcodebuild -exportArchive` : l'archive est construite sans signature (CODE_SIGNING_ALLOWED=NO),
# et les frameworks de Google (AdMob, UMP) y sont copiés sans dossier _CodeSignature, ce que l'envoi refuse
# (« Invalid Signature »). On leur donne une signature provisoire ; l'export les re-signe pour la distribution.
# Usage : scripts/ios-presign-frameworks.sh chemin/vers/App.xcarchive
set -e
for fw in "$1"/Products/Applications/App.app/Frameworks/*.framework; do
  [ -d "$fw/_CodeSignature" ] || codesign --force --sign - --preserve-metadata=identifier "$fw"
done
