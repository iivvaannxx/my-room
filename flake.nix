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
      upkgs = import unstablepkgs { inherit system; };
      pkgs = import nixpkgs { 
        
        inherit system; 
        config.allowUnfree = true; 
      };

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

        # The packages used within the project.
        buildInputs = [ fhsEnv ];
        shellHook = ''

          exec ${fhsEnv}/bin/project-env
        '';
      };
    };

  in eachDefaultSystem mkFlake;
}
