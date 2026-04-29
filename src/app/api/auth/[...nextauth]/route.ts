import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email }).select(
          '+password',
        );

        if (!user) {
          throw new Error('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(
          credentials.password,
          user.password!,
        );

        if (!isMatch) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        await connectDB();
        try {
          const userExists = await User.findOne({ email: user.email });
          if (!userExists) {
            
            await User.create({
              name: user.name ?? 'New User',
              email: user.email as string,
              role: 'student',
            });
          }
          return true;
        } catch (error) {
          console.log('Error checking user:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        // Never trust provider user.id (e.g. Google sub). Prefer our DB User _id.
        // Keep provider id only as a fallback until we resolve the DB user below.
        token.id = user.id;
        // Ensure middleware has onboarding status on first login
        await connectDB();
        const email = (user as any)?.email ?? token.email;
        const dbUser = await User.findOne({ email }).select(
          "_id role onboardingCompletedAt"
        );
        if (dbUser) {
          token.role = dbUser.role;
          token.id = dbUser._id.toString();
          (token as any).onboardingCompletedAt = dbUser.onboardingCompletedAt;
        }
      }
      // Refresh token data on update trigger
      if (trigger === 'update' || !token.role) {
        await connectDB();
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          token.role = dbUser.role;
          token.id = dbUser._id.toString();
          token.phone = dbUser.phone;
          token.location = dbUser.location;
          token.bio = dbUser.bio;
          token.targetScore = dbUser.targetScore;
          token.nextExamDate = dbUser.nextExamDate;
          token.onboardingCompletedAt = dbUser.onboardingCompletedAt;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        (session.user as any).phone = token.phone;
        (session.user as any).location = token.location;
        (session.user as any).bio = token.bio;
        (session.user as any).targetScore = token.targetScore;
        (session.user as any).nextExamDate = token.nextExamDate;
        (session.user as any).onboardingCompletedAt = (token as any).onboardingCompletedAt;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
