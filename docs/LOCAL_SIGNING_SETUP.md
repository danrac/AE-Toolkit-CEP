# Local Signing Setup

This document explains how to configure your local environment for signing CEP extensions.

## Prerequisites

1. **Adobe ZXPSignCmd** - Download from [Adobe CEP Resources](https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD)
2. **Signing Certificate** - A .p12 certificate file with a password
3. **Environment Variables** - Set the following in your shell profile or build environment:

## Configuration

Set these environment variables in your shell profile (e.g., `~/.zshrc` or `~/.bash_profile`):

```bash
export ZXPSIGNCMD_PATH="/path/to/ZXPSignCmd"
export ZXP_CERT_PATH="/path/to/your/certificate.p12"
export ZXP_CERT_PASSWORD="your_certificate_password"
```

### Notes:

- **ZXPSIGNCMD_PATH**: Full path to the ZXPSignCmd executable
- **ZXP_CERT_PATH**: Full path to your .p12 certificate file  
- **ZXP_CERT_PASSWORD**: Password for your certificate (do not commit this)

## Verification

After setting up the environment variables, verify the configuration:

```bash
# Check if ZXPSignCmd is accessible
which ZXPSignCmd

# Check if certificate exists
ls -la $ZXP_CERT_PATH

# Verify environment variables are set
echo $ZXPSIGNCMD_PATH
echo $ZXP_CERT_PATH
```

## Security

- Never commit your certificate password to version control
- Keep your .p12 certificate file secure
- Use different certificates for development and production if possible

## Testing

You can test the configuration by running:

```bash
npm run release:preflight
```

This will validate that all signing prerequisites are properly configured.