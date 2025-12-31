# SSH Keys Explained

An SSH key is a pair of files that lets you prove your identity to a server without typing a password.

## The Two Parts

| File | What it is | Who has it |
|------|-----------|------------|
| `id_rsa` | **Private key** - your secret | Only you, never share |
| `id_rsa.pub` | **Public key** - a lock | Any server you want to access |

## How It Works

```
Your Computer                         Server
─────────────                         ──────
Has: Private Key                      Has: Your Public Key
     (the secret)                          (the lock)

1. You try to connect ──────────────────────────────────►

2. Server sends a challenge ◄────────────────────────────
   "Prove you have the private key"

3. Your computer signs the           Server checks if the
   challenge with private key        signature matches the
   ──────────────────────────────────────────────────────►
                                     public key

4. If it matches ◄───────────────────────────────────────
   "Welcome in!"
```

## Why It's Better Than Passwords

- **Can't be guessed** - A 4096-bit key has more combinations than atoms in the universe
- **Can't be stolen by watching** - Nothing secret is ever sent over the network
- **No typing** - Automatic authentication
- **Revocable** - Remove the public key from a server to block access instantly

## Real-World Analogy

Think of it like a wax seal on a letter:

- **Private key** = Your unique seal stamp (only you have it)
- **Public key** = Everyone knows what your seal looks like
- **Authentication** = Server asks you to stamp something, checks if the seal matches

---

## Setting Up SSH Keys

### Step 1: Check if you already have an SSH key

Open PowerShell or Command Prompt:

```powershell
cat ~/.ssh/id_rsa.pub
```

If you see a key starting with `ssh-rsa`, skip to Step 3.

### Step 2: Generate a new SSH key (if needed)

```powershell
ssh-keygen -t rsa -b 4096
```

Press Enter to accept the default location, then optionally set a passphrase.

### Step 3: Copy your public key

```powershell
cat ~/.ssh/id_rsa.pub
```

Select and copy the entire output (starts with `ssh-rsa`, ends with your username).

### Step 4: Add to Digital Ocean

1. Go to **Digital Ocean** → **Settings** → **Security** → **SSH Keys**

   Or direct link: https://cloud.digitalocean.com/account/security

2. Click **Add SSH Key**

3. Paste your public key

4. Give it a name (e.g., "My Laptop")

5. Click **Add SSH Key**

### Step 5: Select it when creating Droplet

When you create your Droplet, under "Authentication" choose **SSH Key** and check the key you just added.

---

After the Droplet is created, you can connect with:

```powershell
ssh root@YOUR_DROPLET_IP
```

No password needed - it uses your SSH key automatically.
