# CardTwin SAM 2.1 environment

This project uses the official Meta SAM 2.1 image predictor. It does not use SAM3D, mesh reconstruction, or a substitute segmenter. All external code, environments, caches, weights, and generated smoke artifacts live under `/mnt/zer0models`; no model artifact is stored in Git.

## Pinned provenance

- Repository: `https://github.com/facebookresearch/sam2.git`
- Commit: `2b90b9f5ceec907a1c18123530e92e794ad901a4`
- Code license: Apache-2.0 (`LICENSE` at the pinned commit)
- Environment: `/mnt/zer0models/project-envs/cardtwin-sam2` (Python 3.11)
- Freeze: `requirements/cardtwin-sam2-pip-freeze.txt`
- Model: SAM 2.1 Hiera Tiny (`sam2.1_hiera_tiny.pt`)
- Official source: `https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt`
- Destination: `/mnt/zer0models/models/sam2.1/sam2.1_hiera_tiny.pt`
- SHA-256: `7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69`
- Byte count: `156008466`
- Target verified: NVIDIA GeForce RTX 3080 Ti, 12,288 MiB

## Reproduce

Run from this repository worktree. These commands create an isolated virtual environment and never invoke system `pip`:

```sh
export XDG_CACHE_HOME=/mnt/zer0models/caches/cardtwin-sam2/xdg
export HF_HOME=/mnt/zer0models/caches/cardtwin-sam2/huggingface
export TORCH_HOME=/mnt/zer0models/caches/cardtwin-sam2/torch
export PIP_CACHE_DIR=/mnt/zer0models/caches/cardtwin-sam2/pip
mkdir -p "$XDG_CACHE_HOME" "$HF_HOME" "$TORCH_HOME" "$PIP_CACHE_DIR" \
  /mnt/zer0models/project-envs /mnt/zer0models/repos /mnt/zer0models/models/sam2.1
python3 -m venv /mnt/zer0models/project-envs/cardtwin-sam2
/mnt/zer0models/project-envs/cardtwin-sam2/bin/python -m pip install --upgrade pip

git clone https://github.com/facebookresearch/sam2.git /mnt/zer0models/repos/sam2
git -C /mnt/zer0models/repos/sam2 checkout --detach 2b90b9f5ceec907a1c18123530e92e794ad901a4
/mnt/zer0models/project-envs/cardtwin-sam2/bin/python -m pip install -r requirements/cardtwin-sam2-pip-freeze.txt

curl --fail --location \
  https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt \
  --output /mnt/zer0models/models/sam2.1/sam2.1_hiera_tiny.pt
printf '%s  %s\n' \
  7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69 \
  /mnt/zer0models/models/sam2.1/sam2.1_hiera_tiny.pt | sha256sum --check
```

The freeze pins SAM 2 as an editable VCS requirement at the exact commit. If the repository already exists, verify it with `git -C /mnt/zer0models/repos/sam2 rev-parse HEAD` instead of cloning over it.

## GPU smoke test

```sh
export XDG_CACHE_HOME=/mnt/zer0models/caches/cardtwin-sam2/xdg
export HF_HOME=/mnt/zer0models/caches/cardtwin-sam2/huggingface
export TORCH_HOME=/mnt/zer0models/caches/cardtwin-sam2/torch
export PIP_CACHE_DIR=/mnt/zer0models/caches/cardtwin-sam2/pip
/mnt/zer0models/project-envs/cardtwin-sam2/bin/python scripts/smoke-test-cardtwin-sam2.py
```

The smoke test creates a local synthetic RGB input, loads the pinned checkpoint on CUDA, runs both point and box prompts, verifies each mask matches the source dimensions, and writes binary masks plus aligned RGBA outputs under `/mnt/zer0models/project-artifacts/cardtwin-sam2-smoke`. `report.json` records scores, foreground pixel counts, GPU name, and peak allocated GPU memory.
