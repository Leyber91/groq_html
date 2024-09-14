# Set the output file path to the same directory where the script is executed
$outputFile = "$PSScriptRoot\DetailedFileTreeOutput.txt"

# Clear the output file if it exists, or create it if it doesn't
Clear-Content -Path $outputFile -ErrorAction SilentlyContinue
New-Item -ItemType File -Path $outputFile -Force

# Retry logic for file writing to handle file locking
function SafeAdd-Content {
    param (
        [string]$Path,
        [string]$Value
    )

    $maxRetries = 5
    $retryCount = 0
    while ($retryCount -lt $maxRetries) {
        try {
            Add-Content -Path $Path -Value $Value
            return
        } catch {
            # If there's an IO exception, wait and retry
            Start-Sleep -Milliseconds 500
            $retryCount++
        }
    }
    # If after retries the issue persists, throw an error
    throw "Failed to write to file after $maxRetries attempts."
}

# Recursive function to generate the tree structure
function Get-FolderTree {
    param (
        [string]$path,
        [string]$basePath,
        [int]$indentLevel = 0
    )

    # Get all files and folders in the current directory
    $items = Get-ChildItem -Path $path -Recurse -Force

    foreach ($item in $items) {
        # Create indentation based on the depth level
        $indent = " " * ($indentLevel * 4)

        if ($item.PSIsContainer) {
            # Output relative folder name to the file
            $relativePath = $item.FullName.Substring($basePath.Length + 1)
            SafeAdd-Content -Path $outputFile -Value "$indent Folder: $relativePath"
            
            # Recursively get the contents of the folder
            Get-FolderTree -path $item.FullName -basePath $basePath -indentLevel ($indentLevel + 1)
        } else {
            # Output relative file name to the file
            $relativePath = $item.FullName.Substring($basePath.Length + 1)
            SafeAdd-Content -Path $outputFile -Value "$indent File: $relativePath"
            
            # If it's a PowerShell script or JavaScript file, search for functions and constants
            if ($item.Extension -eq ".ps1" -or $item.Extension -eq ".js") {
                Get-FunctionsAndConstants -scriptPath $item.FullName -basePath $basePath -indentLevel ($indentLevel + 1)
            }
        }
    }
}

# Function to extract functions, constants, imports, and more from a script
function Get-FunctionsAndConstants {
    param (
        [string]$scriptPath,
        [string]$basePath,
        [int]$indentLevel = 0
    )

    # Create indentation for functions and constants
    $indent = " " * ($indentLevel * 4)

    # Read the script file
    $scriptContent = Get-Content -Path $scriptPath -Raw

    # Check if the content is null or empty
    if ([string]::IsNullOrEmpty($scriptContent)) {
        SafeAdd-Content -Path $outputFile -Value "$indent No content found in ${scriptPath}."
        return
    }

    # Get relative path for the script file
    $relativeScriptPath = $scriptPath.Substring($basePath.Length + 1)

    # Find functions
    $functions = [regex]::Matches($scriptContent, "function\s+[\w-]+\s*\(")
    if ($functions.Count -gt 0) {
        SafeAdd-Content -Path $outputFile -Value "$indent  Functions found in ${relativeScriptPath}:"
        foreach ($function in $functions) {
            SafeAdd-Content -Path $outputFile -Value "$indent    $($function.Value)"
        }
    }

    # Find constants (variables assigned with `=` which you might treat as constants)
    $constants = [regex]::Matches($scriptContent, "\$[A-Za-z0-9_]+\s*=\s*[^=]+")
    if ($constants.Count -gt 0) {
        SafeAdd-Content -Path $outputFile -Value "$indent  Constants found in ${relativeScriptPath}:"
        foreach ($constant in $constants) {
            SafeAdd-Content -Path $outputFile -Value "$indent    $($constant.Value)"
        }
    }

    # Find inputs (parameters inside param blocks)
    $inputs = [regex]::Matches($scriptContent, "param\s*\(")
    if ($inputs.Count -gt 0) {
        SafeAdd-Content -Path $outputFile -Value "$indent  Inputs found in ${relativeScriptPath}:"
        foreach ($input in $inputs) {
            SafeAdd-Content -Path $outputFile -Value "$indent    $($input.Value)"
        }
    }

    # Find outputs (return statements)
    $outputs = [regex]::Matches($scriptContent, "return\s+\$[A-Za-z0-9_]+")
    if ($outputs.Count -gt 0) {
        SafeAdd-Content -Path $outputFile -Value "$indent  Outputs found in ${relativeScriptPath}:"
        foreach ($output in $outputs) {
            SafeAdd-Content -Path $outputFile -Value "$indent    $($output.Value)"
        }
    }

    # Find imports (Import-Module or require in JS)
    $imports = [regex]::Matches($scriptContent, "(Import-Module|require\(['""][^'""]+['""]\))")
    if ($imports.Count -gt 0) {
        SafeAdd-Content -Path $outputFile -Value "$indent  Imports found in ${relativeScriptPath}:"
        foreach ($import in $imports) {
            SafeAdd-Content -Path $outputFile -Value "$indent    $($import.Value)"
        }
    }

    # Find exports (Export-ModuleMember in PS or module.exports in JS)
    $exports = [regex]::Matches($scriptContent, "(Export-ModuleMember|module\.exports\s*=)")
    if ($exports.Count -gt 0) {
        SafeAdd-Content -Path $outputFile -Value "$indent  Exports found in ${relativeScriptPath}:"
        foreach ($export in $exports) {
            SafeAdd-Content -Path $outputFile -Value "$indent    $($export.Value)"
        }
    }
}

# Run the function to list folder contents, functions, and constants, starting with the current directory
$basePath = (Get-Location).Path
Get-FolderTree -path $basePath -basePath $basePath

# Notify the user that the process is complete
Write-Host "Detailed results have been written to $outputFile"
