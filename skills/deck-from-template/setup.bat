@echo off
setlocal enableextensions
title deck-from-template - setup (Windows, sans admin)
set "SKILL_DIR=%~dp0"
set "WARN=0"

echo ============================================================
echo   deck-from-template  -  setup Windows (SANS droits admin)
echo ============================================================
echo.

REM --------------------------------------------------------- 1. Python
where python >nul 2>&1
if errorlevel 1 (
  echo [X] Python introuvable dans le PATH.
  echo     Ton IT l'a installe : ouvre un terminal ou "python" repond,
  echo     ou ajoute son dossier au PATH utilisateur, puis relance.
  goto :fail
)
echo [OK] Python:
python --version

REM --------------------------------------------------------- 2. Paquets Python (mode --user, sans admin)
echo.
echo [..] Installation des paquets Python en mode utilisateur (--user)...
python -m pip install --user --upgrade pip >nul 2>&1
python -m pip install --user "markitdown[pptx]" python-pptx defusedxml lxml
if errorlevel 1 (
  echo [X] Echec pip --user. Verifie la connexion reseau, puis relance.
  goto :fail
)
echo [OK] Paquets Python installes (dans ton profil utilisateur).
echo     Si la commande "markitdown" n'est pas trouvee ensuite, utilise
echo     "python -m markitdown" ou ajoute le dossier Scripts --user au PATH.

REM --------------------------------------------------------- 3. Scripts embarques presents ?
echo.
if exist "%SKILL_DIR%scripts\deck.py" (
  echo [OK] Scripts embarques presents ^(scripts\deck.py, scripts\validate_pptx.py^).
  echo     Ce skill est autonome - aucune dependance a un autre skill.
) else (
  echo [!] scripts\deck.py introuvable - le package est incomplet.
  set "WARN=1"
)

REM --------------------------------------------------------- 4. QA visuelle = PowerPoint (deja installe)
echo.
echo [i] QA visuelle: tu ouvriras le deck genere dans TON PowerPoint (rendu de reference).
echo     Aucune installation requise pour ca.

REM --------------------------------------------------------- 5. LibreOffice = OPTIONNEL (auto-render agent)
echo.
where soffice >nul 2>&1
if errorlevel 1 (
  echo [i] LibreOffice absent - OPTIONNEL. Non requis puisque tu QA dans PowerPoint.
  echo     Pour activer l'auto-render par l'agent SANS admin:
  echo       1^) telecharge LibreOffice "Portable" ^(dossier autonome, pas d'install^)
  echo       2^) ajoute son dossier ...\App\libreoffice\program au PATH utilisateur:
  echo          setx PATH "%%PATH%%;C:\chemin\vers\LibreOfficePortable\App\libreoffice\program"
  echo       3^) idem pour Poppler ^(pdftoppm^): dezippe et ajoute ...\Library\bin au PATH user
) else (
  echo [OK] LibreOffice detecte - l'agent pourra aussi rendre les slides lui-meme.
)

REM --------------------------------------------------------- 6. Node (optionnel)
echo.
where node >nul 2>&1
if errorlevel 1 (
  echo [i] Node.js absent - OPTIONNEL ^(seulement pour regenerer le placeholder^).
) else (
  echo [OK] Node.js present ^(optionnel^).
)

echo.
echo ============================================================
if "%WARN%"=="1" (
  echo   Setup termine AVEC un point [!] a regler ^(voir ci-dessus^).
) else (
  echo   Setup termine. Pret a l'emploi ^(QA visuelle dans PowerPoint^).
)
echo ============================================================
goto :end

:fail
echo.
echo Setup interrompu.

:end
endlocal
pause
