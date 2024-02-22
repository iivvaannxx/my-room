{
  inputs = {

    nixpkgs.url = "github:NixOS/nixpkgs/master";
    unstablepkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, unstablepkgs, flake-utils }: let

    inherit (flake-utils.lib) eachDefaultSystem;
    mkFlake = system: let

      # The set of packages to be used.
      pkgs = import nixpkgs { inherit system; };
      upkgs = import unstablepkgs { inherit system; };

      fhsEnv = pkgs.buildFHSUserEnv {
        
        name = "project-env";
        targetPkgs = pkgs: [

          # The packages used within the project.
          pkgs.bun
          upkgs.biome
        ];
      };

    in {

      devShells.default = pkgs.mkShell {

        buildInputs = [ fhsEnv ];
        shellHook = ''

          echo "Entering the project environment..."
          echo -n "The following packages are available: ${fhsEnv}"

          exec ${fhsEnv}/bin/project-env
        '';
      };
    };

  in eachDefaultSystem mkFlake;
}
