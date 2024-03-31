{
  inputs = {

    flake-utils.url = "github:numtide/flake-utils";

    # Until the XZ vulnerability is cleared out. 
    # The `xz` version in this branch seems to be unaffected.
    # See: https://discourse.nixos.org/t/cve-2024-3094-malicious-code-in-xz-5-6-0-and-5-6-1-tarballs/42405/9
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-23.11";
  };

  outputs = { self, nixpkgs, flake-utils }: let

    inherit (flake-utils.lib) eachDefaultSystem;
    mkFlake = system: let

      # The set of packages to be used.
      pkgs = import nixpkgs { 
        
        inherit system; 
        config.allowUnfree = true; 
      };

      env-name = "my-room";
      fhsEnv = pkgs.buildFHSUserEnv {
        
        name = "${env-name}";
        targetPkgs = pkgs: [

          # The packages used within the project.
          pkgs.nodejs-slim
          pkgs.nodePackages_latest.pnpm

          pkgs.bun
          pkgs.biome
        ];
      };

    in {

      devShells.default = pkgs.mkShell {

        # The packages used within the project.
        buildInputs = [ fhsEnv ];
        shellHook = ''

          exec ${fhsEnv}/bin/${env-name}
        '';
      };
    };

  in eachDefaultSystem mkFlake;
}
